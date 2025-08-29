import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import datetime

# === Конфигурация ===
file_path = '/home/user/HpProject/FA_full_data.xlsx'
db_uri = 'postgresql://fauser:rnimufargnkc@localhost:5433/fa_rgnkc_db'
base_table = 'fa_rgnkc_data'
map_table = 'fa_rgnkc_mapping'
BATCH_SIZE = 200  # размер батча для INSERT

# === Чтение Excel ===
try:
    df = pd.read_excel(file_path)
    print(f"Файл прочитан успешно. Столбцов: {len(df.columns)}, строк: {len(df)}")
except Exception as e:
    print(f"Ошибка при чтении Excel-файла: {e}")
    raise SystemExit(1)

original_columns = df.columns.tolist()

# === Генерируем новые имена col_1, col_2, ... ===
new_columns = [f"col_{i+1}" for i in range(len(original_columns))]

# Меняем имена столбцов в данных
df_renamed = df.copy()
df_renamed.columns = new_columns

print("\n✅ Колонки переименованы (первые 5):")
for i in range(min(5, len(new_columns))):
    print(f"  {new_columns[i]} ← {original_columns[i]}")

# === Определение SQL-типов по данным ===
def get_sql_type(series: pd.Series) -> str:
    if pd.api.types.is_integer_dtype(series):
        return 'INTEGER'
    elif pd.api.types.is_float_dtype(series):
        return 'FLOAT'
    elif pd.api.types.is_datetime64_any_dtype(series):
        return 'DATE'  # если у тебя есть время — замени на TIMESTAMP
    else:
        return 'TEXT'

col_sql_types = [get_sql_type(df_renamed[c]) for c in new_columns]

# === Создание SQL DDL ===
data_columns_sql = [f'    "{col}" {col_sql_types[i]}' for i, col in enumerate(new_columns)]
create_data_sql = f"""
CREATE TABLE {base_table} (
{', '.join(data_columns_sql)}
);
"""

create_map_sql = f"""
CREATE TABLE {map_table} (
    name_base_table TEXT,
    full_name TEXT
);
"""

# === Подготовка маппинга (без замены символов) ===
mapping_records = [
    (new, str(orig)) # <--- ИЗМЕНЕНИЕ ЗДЕСЬ: убрано .replace('_', ' ')
    for new, orig in zip(new_columns, original_columns)
]

# === Функция подготовки значения под тип для INSERT ===
def prepare_cell(value, sql_type):
    # NULL
    if pd.isna(value):
        return None

    if sql_type == 'DATE':
        # приводим к date
        if isinstance(value, pd.Timestamp):
            return value.date()
        if isinstance(value, datetime.datetime):
            return value.date()
        if isinstance(value, datetime.date):
            return value
        # пробуем распарсить строку
        try:
            return pd.to_datetime(value, errors='coerce').date()
        except Exception:
            return None

    if sql_type == 'INTEGER':
        try:
            # Осторожно: float вида 12.0 -> 12
            if isinstance(value, float) and value.is_integer():
                return int(value)
            return int(value)
        except Exception:
            return None

    if sql_type == 'FLOAT':
        try:
            return float(value)
        except Exception:
            return None

    # TEXT — всё остальное в строку
    return str(value)

# === Подготовка INSERT для данных ===
columns_list_sql = ','.join([f'"{c}"' for c in new_columns])
insert_data_sql = f'INSERT INTO {base_table} ({columns_list_sql}) VALUES %s'

# === Работа с БД ===
try:
    conn = psycopg2.connect(db_uri)
    cur = conn.cursor()

    # Переcоздаём таблицы
    cur.execute(f'DROP TABLE IF EXISTS {base_table};')
    cur.execute(f'DROP TABLE IF EXISTS {map_table};')
    cur.execute(create_data_sql)
    cur.execute(create_map_sql)

    # Загружаем маппинг
    execute_values(
        cur,
        f'INSERT INTO {map_table} (name_base_table, full_name) VALUES %s',
        mapping_records,
        page_size=1000
    )
    print(f"\n📚 В {map_table} добавлено записей: {len(mapping_records)}")

    # Готовим и грузим данные батчами
    total_rows = 0
    batch = []
    for row in df_renamed.itertuples(index=False, name=None):
        prepared = [prepare_cell(row[j], col_sql_types[j]) for j in range(len(new_columns))]
        batch.append(tuple(prepared))
        if len(batch) >= BATCH_SIZE:
            execute_values(cur, insert_data_sql, batch, page_size=BATCH_SIZE)
            total_rows += len(batch)
            batch.clear()

    # Хвост
    if batch:
        execute_values(cur, insert_data_sql, batch, page_size=BATCH_SIZE)
        total_rows += len(batch)
        batch.clear()

    conn.commit()
    print(f"✅ Данные загружены: {total_rows} строк в {base_table}")

except Exception as e:
    if 'conn' in locals():
        conn.rollback()
    print(f"\n❌ Ошибка при работе с БД: {e}")

finally:
    if 'cur' in locals():
        cur.close()
    if 'conn' in locals():
        conn.close()