# # backend/routers/upload_patients.py
from fastapi import APIRouter, File, UploadFile, HTTPException, Depends
from fastapi.responses import JSONResponse
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import io
import datetime
from typing import List, Dict, Any
import os
from dotenv import load_dotenv
import numpy as np
import json
from ctgan import CTGAN
import torch
import re
import warnings

warnings.filterwarnings('ignore')

load_dotenv()

router = APIRouter()

# Конфигурация БД
DB_URI = os.getenv("DATABASE_URL")
BASE_TABLE = 'fa_rgnkc_data'
MAP_TABLE = 'fa_rgnkc_mapping'
BATCH_SIZE = 200

# Получаем путь к текущему файлу
script_path = os.path.abspath(__file__)

# Определяем корневой каталог проекта
# (в данном случае, поднимаемся на два уровня вверх от routers)
project_root = os.path.dirname(os.path.dirname(os.path.dirname(script_path)))

# Строим путь к модели от корневого каталога
MODEL_PATH = os.path.join(project_root, 'models', 'ctgan', 'ctgan_optimal_model.pkl')

# Для отладки можно распечатать путь
print(f"Путь к модели: {MODEL_PATH}")

# Загрузка модели CTGAN
try:
    loaded_ctgan = CTGAN.load(MODEL_PATH)
    print("✅ Модель CTGAN успешно загружена!")
except Exception as e:
    raise RuntimeError(f"Ошибка загрузки модели CTGAN: {str(e)}")

# Устанавливаем сиды для воспроизводимости
np.random.seed(42)
torch.manual_seed(42)

# Словарь нужных столбцов (ключи - col_XX, значения - оригинальные имена с заменой _ на пробел)
column_dict = {
    "col_7": "Похудели_ли_вы_на_5_кг_и_более_за_последние_6_месяцев?_*(непреднамеренное_снижение_веса)_(СКРИНИНГ_«ВОЗРАСТ_НЕ_ПОМЕХА»)",
    "col_8": "Испытываете_ли_вы_какие-либо_ограничения_в_повседневной_жизни_из-за_снижения_зрения_или_слуха?_(СКРИНИНГ_«ВОЗРАСТ_НЕ_ПОМЕХА»)",
    "col_9": "Были_ли_у_вас_в_течение_последнего_года_травмы__связанные_с_падением?_(СКРИНИНГ_«ВОЗРАСТ_НЕ_ПОМЕХА»)",
    "col_10": "Чувствуете_ли_вы_себя_подавленным__грустным_или_встревоженным_на_протяжении_последних_недель?_(СКРИНИНГ_«ВОЗРАСТ_НЕ_ПОМЕХА»)",
    "col_11": "Есть_ли_у_вас_проблемы_с_памятью__пониманием__ориентацией_или_способностью_планировать?_(СКРИНИНГ_«ВОЗРАСТ_НЕ_ПОМЕХА»)",
    "col_12": "Страдаете_ли_вы_недержанием_мочи?_(СКРИНИНГ_«ВОЗРАСТ_НЕ_ПОМЕХА»)",
    "col_13": "Испытываете_ли_вы_трудности_в_перемещении_по_дому_или_на_улице?_(ходьба_до_100м/_подъем_на_1_лестничный_пролет)_(СКРИНИНГ_«ВОЗРАСТ_НЕ_ПОМЕХА»)",
    "col_14": "ВОЗРАСТ_НЕ_ПОМЕХА_количество_баллов_(СКРИНИНГ_«ВОЗРАСТ_НЕ_ПОМЕХА»)",
    "col_58": "Физическая_активность_-_кратность_(Факторы_риска_хронических_неинфекционных_заболеваний)",
    "col_59": "Физическая_активность_-_продолжительность_(Факторы_риска_хронических_неинфекционных_заболеваний)",
    "col_85": "ИМТ_(кг/м^2)_(Осмотр)",
    "col_222": "Прием_пищи_(Шкала_базовой_активности_в_повседневной_жизни_(индекс_Бартел)_-ADL)",
    "col_223": "Личная_гигиена_(Шкала_базовой_активности_в_повседневной_жизни_(индекс_Бартел)_-ADL)",
    "col_224": "Одевание_(Шкала_базовой_активности_в_повседневной_жизни_(индекс_Бартел)_-ADL)",
    "col_225": "Прием_ванны_(Шкала_базовой_активности_в_повседневной_жизни_(индекс_Бартел)_-ADL)",
    "col_226": "Посещение_туалета_(Шкала_базовой_активности_в_повседневной_жизни_(индекс_Бартел)_-ADL)",
    "col_227": "Контролирование_мочеиспускания_(Шкала_базовой_активности_в_повседневной_жизни_(индекс_Бартел)_-ADL)",
    "col_228": "Контролирование_дефекации_(Шкала_базовой_активности_в_повседневной_жизни_(индекс_Бартел)_-ADL)",
    "col_229": "Перемещение_с_кровати_на_стул_и_обратно_(Шкала_базовой_активности_в_повседневной_жизни_(индекс_Бартел)_-ADL)",
    "col_230": "Подъем_по_лестнице_(Шкала_базовой_активности_в_повседневной_жизни_(индекс_Бартел)_-ADL)",
    "col_231": "Мобильность_(в_пределах/вне_дома;_могут_использоваться_вспомогательные_средства)_(Шкала_базовой_активности_в_повседневной_жизни_(индекс_Бартел)_-ADL)",
    "col_232": "индекс_Бартел_количество_баллов_(Шкала_базовой_активности_в_повседневной_жизни_(индекс_Бартел)_-ADL)",
    "col_242": "Положение_«стопы_вместе»_(Время__секунды)_(Краткая_батарея_тестов_физического_функционирования_(SPPB))",
    "col_243": "Полутандемное_положение_(Время__секунды)_(Краткая_батарея_тестов_физического_функционирования_(SPPB))",
    "col_244": "Тандемное_положение_(Время__секунды)_(Краткая_батарея_тестов_физического_функционирования_(SPPB))",
    "col_245": "Ходьба_на_4_м_(Время__секунды)_(Краткая_батарея_тестов_физического_функционирования_(SPPB))",
    "col_246": "Ходьба_на_4_метра_(Краткая_батарея_тестов_физического_функционирования_(SPPB))",
    "col_247": "Подъём_со_стула_(Время__секунды)_(Краткая_батарея_тестов_физического_функционирования_(SPPB))",
    "col_248": "Подъём_со_стула_(Краткая_батарея_тестов_физического_функционирования_(SPPB))",
    "col_249": "SPPB_количество_баллов_(Краткая_батарея_тестов_физического_функционирования_(SPPB))",
    "col_252": "Тест_«встань_и_иди»_(сек)_(≤10_–_норма;_≥14_-_риск_падений):_(Тест_«встань_и_иди»)",
    "col_254": "Уровень_(Стратификация_по_уровню_физической_активности)"
}

# Желаемые столбцы для CTGAN
desired_cols = ['col_14', 'col_58', 'col_59', 'col_85', 'col_232', 'col_249', 'col_252', 'col_245', 'col_254']

# Столбцы для суммы баллов
sum_components = {
    'col_14': ['col_7', 'col_8', 'col_9', 'col_10', 'col_11', 'col_12', 'col_13'],
    'col_232': ['col_222', 'col_223', 'col_224', 'col_225', 'col_226', 'col_227', 'col_228', 'col_229', 'col_230', 'col_231'],
    'col_249': ['col_242', 'col_243', 'col_244', 'col_245', 'col_246', 'col_247', 'col_248']
}

# Mappings для col_58 and col_59
col_58_mapping = {
    '<1 раза в месяц': 0.0,
    '<1 раза в неделю': 1.0,
    '1 раз в неделю': 2.0,
    '2-3 раза в неделю': 3.0,
    'Ежедневно': 4.0
}

col_59_mapping = {
    '<30 мин': 0.0,
    '30-60 мин': 1.0,
    '1-4 часа': 2.0,
    '>4 часов': 3.0
}

col_58_reverse_mapping = {v: k for k, v in col_58_mapping.items()}
col_59_reverse_mapping = {v: k for k, v in col_59_mapping.items()}

# Корректирование стат для столбцов
column_stats = {
    'col_14': {'min': 0.0, 'max': 7.0, 'decimal_places': 0, 'type': 'integer'},
    'col_58': {'min': 0.0, 'max': 4.0, 'decimal_places': 0, 'type': 'integer'},
    'col_59': {'min': 0.0, 'max': 3.0, 'decimal_places': 0, 'type': 'integer'},
    'col_85': {'min': None, 'max': None, 'decimal_places': 2, 'type': 'float'},
    'col_232': {'min': 0.0, 'max': 100.0, 'decimal_places': 0, 'type': 'integer'},
    'col_249': {'min': 0.0, 'max': 12.0, 'decimal_places': 0, 'type': 'integer'},
    'col_252': {'min': None, 'max': None, 'decimal_places': 2, 'type': 'float'},
    'col_245': {'min': 0.0, 'max': 4.0, 'decimal_places': 0, 'type': 'integer'},
    'col_254': {'min': 1.0, 'max': 5.0, 'decimal_places': 0, 'type': 'integer'}
}

def preprocess_col_58(value):
    if pd.isna(value):
        return np.nan
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        value = value.strip().replace('[', '').replace(']', '')
        if value in col_58_mapping:
            return col_58_mapping[value]
    return np.nan

def preprocess_col_59(value):
    if pd.isna(value):
        return np.nan
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        value = value.strip().replace('[', '').replace(']', '')
        if value in col_59_mapping:
            return col_59_mapping[value]
    return np.nan

def extract_numeric_value(value):
    if pd.isna(value):
        return np.nan
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        value = value.strip()
        match = re.search(r'(\d+)\s*-\s*[<≤≥>]?\s*(\d+(?:[.,]\d+)?)', value)
        if match:
            return float(match.group(1))
        match = re.search(r'(\d+)\s*:\s*\d+(?:[.,]\d+)?', value)
        if match:
            return float(match.group(1))
        match = re.search(r'(\d+(?:[.,]\d+)?)', value.replace(',', '.'))
        if match:
            return float(match.group(1).replace(',', '.'))
    return np.nan

def adjust_synthetic_values(synth_value, col_name):
    if col_name not in column_stats:
        return synth_value
    stats = column_stats[col_name]
    min_val = stats['min']
    max_val = stats['max']
    decimal_places = stats['decimal_places']
    value_type = stats['type']
    adjusted_value = np.clip(synth_value, min_val, max_val)
    if value_type == 'integer':
        adjusted_value = round(adjusted_value)
    else:
        adjusted_value = round(adjusted_value, decimal_places)
    return float(adjusted_value)

def reverse_col_58(value):
    if pd.isna(value):
        return np.nan
    rounded_value = round(float(value))
    if rounded_value in col_58_reverse_mapping:
        return f"{col_58_reverse_mapping[rounded_value]}"
    if rounded_value < 0:
        return f"{col_58_reverse_mapping[0.0]}"
    elif rounded_value > 4:
        return f"{col_58_reverse_mapping[4.0]}"
    closest_key = min(col_58_reverse_mapping.keys(), key=lambda x: abs(x - rounded_value))
    return f"{col_58_reverse_mapping[closest_key]}"

def reverse_col_59(value):
    if pd.isna(value):
        return np.nan
    rounded_value = round(float(value))
    if rounded_value in col_59_reverse_mapping:
        return f"{col_59_reverse_mapping[rounded_value]}"
    if rounded_value < 0:
        return f"{col_59_reverse_mapping[0.0]}"
    elif rounded_value > 3:
        return f"{col_59_reverse_mapping[3.0]}"
    closest_key = min(col_59_reverse_mapping.keys(), key=lambda x: abs(x - rounded_value))
    return f"{col_59_reverse_mapping[closest_key]}"

# Обратный словарь для переименования оригинала в col_n
inverse_column_dict = {v: k for k, v in column_dict.items()}

# Столбцы для проверки
main_missing_check_cols = [
    column_dict['col_14'],
    column_dict['col_58'],
    column_dict['col_59'],
    column_dict['col_85'],
    column_dict['col_232'],
    column_dict['col_249'],
    column_dict['col_252'],
    column_dict['col_245'],
    column_dict['col_254']
]

def get_db_connection():
    try:
        conn = psycopg2.connect(DB_URI)
        return conn
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка подключения к БД: {str(e)}")

def get_sql_type(series: pd.Series) -> str:
    if pd.api.types.is_integer_dtype(series):
        return 'INTEGER'
    elif pd.api.types.is_float_dtype(series):
        return 'FLOAT'
    elif pd.api.types.is_datetime64_any_dtype(series):
        return 'DATE'
    else:
        return 'TEXT'

def clean_json_value(value):
    if pd.isna(value):
        return None
    if isinstance(value, (float, np.floating)):
        if np.isnan(value) or np.isinf(value):
            return None
        return float(value)
    if isinstance(value, (np.integer, np.int64, np.int32)):
        return int(value)
    if isinstance(value, (pd.Timestamp, datetime.datetime)):
        return value.strftime('%Y-%m-%d %H:%M:%S')
    if isinstance(value, datetime.date):
        return value.strftime('%Y-%m-%d')
    return str(value)

def prepare_cell(value, sql_type):
    if pd.isna(value):
        return None
    if sql_type == 'DATE':
        if isinstance(value, pd.Timestamp):
            return value.date()
        if isinstance(value, datetime.datetime):
            return value.date()
        if isinstance(value, datetime.date):
            return value
        try:
            return pd.to_datetime(value, errors='coerce').date()
        except Exception:
            return None
    if sql_type == 'INTEGER':
        try:
            if isinstance(value, float):
                if np.isnan(value) or np.isinf(value):
                    return None
                if value.is_integer():
                    return int(value)
            return int(value)
        except Exception:
            return None
    if sql_type == 'FLOAT':
        try:
            float_val = float(value)
            if np.isnan(float_val) or np.isinf(float_val):
                return None
            return float_val
        except Exception:
            return None
    return str(value)

def get_existing_patient_codes():
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute(f'SELECT DISTINCT "col_1" FROM {BASE_TABLE} WHERE "col_1" IS NOT NULL')
        existing_codes = {row[0] for row in cur.fetchall()}
        return existing_codes
    finally:
        cur.close()
        conn.close()

def get_column_mapping():
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute(f'SELECT name_base_table, full_name FROM {MAP_TABLE}')
        mapping = {row[1]: row[0] for row in cur.fetchall()}
        return mapping
    finally:
        cur.close()
        conn.close()

def clean_dataframe_for_json(df):
    cleaned_df = df.copy()
    for col in cleaned_df.columns:
        if cleaned_df[col].dtype in ['float64', 'float32']:
            cleaned_df[col] = cleaned_df[col].replace([np.inf, -np.inf], np.nan)
    return cleaned_df

def fill_missing_with_sums_and_synthetic(df_row: pd.DataFrame):
    if 'col_58' in df_row.columns:
        df_row['col_58'] = df_row['col_58'].apply(preprocess_col_58)
    if 'col_59' in df_row.columns:
        df_row['col_59'] = df_row['col_59'].apply(preprocess_col_59)
    for col in desired_cols:
        if col in df_row.columns and col not in ['col_58', 'col_59']:
            df_row[col] = df_row[col].apply(extract_numeric_value)

    # Заполняем сумму
    for sum_col, components in sum_components.items():
        if sum_col in df_row.columns:
            if pd.isna(df_row.loc[0, sum_col]):
                component_values = []
                all_filled = True
                for comp in components:
                    if comp in df_row.columns:
                        comp_val = df_row.loc[0, comp]
                        if pd.isna(comp_val):
                            all_filled = False
                            break
                        component_values.append(float(comp_val) if not pd.isna(comp_val) else 0)
                if all_filled and component_values:
                    sum_value = sum(component_values)
                    df_row.loc[0, sum_col] = sum_value

    # Если в desired_cols все еще отсутствует, используем синтетитику
    missing_in_desired = df_row[desired_cols].isnull().any(axis=1).any()
    if missing_in_desired:
        synth_data = loaded_ctgan.sample(1)
        for col in synth_data.columns:
            synth_data[col] = synth_data[col].apply(lambda x: adjust_synthetic_values(x, col))
        synth_row = synth_data.iloc[0]
        for col in desired_cols:
            if pd.isna(df_row.loc[0, col]):
                df_row.loc[0, col] = synth_row[col]

    # Обратное преобразование
    if 'col_58' in df_row.columns:
        df_row['col_58'] = df_row['col_58'].apply(reverse_col_58)
    if 'col_59' in df_row.columns:
        df_row['col_59'] = df_row['col_59'].apply(reverse_col_59)

    return df_row

@router.post("/check-new-patients")
async def check_new_patients(file: UploadFile = File(...)):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Файл должен быть в формате Excel (.xlsx или .xls)")
    
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        if df.empty:
            raise HTTPException(status_code=400, detail="Файл пуст")
        
        df = clean_dataframe_for_json(df)
        
        patient_code_column = "Код_карты_пациента"  # Исправлено на пробелы, предполагая оригинал
        
        if patient_code_column not in df.columns:
            raise HTTPException(status_code=400, detail=f"В файле отсутствует колонка '{patient_code_column}'")
        
        existing_codes = get_existing_patient_codes()
        
        file_codes = set(df[patient_code_column].dropna().astype(str))
        new_codes = file_codes - {str(code) for code in existing_codes}
        
        if not new_codes:
            return JSONResponse(content={
                "status": "no_new_patients",
                "message": "Новых пациентов не найдено"
            })
        
        new_patients_df = df[df[patient_code_column].astype(str).isin(new_codes)]
        new_patients_list = []
        
        for _, row in new_patients_df.iterrows():
            patient_code = str(row[patient_code_column])
            cleaned_row_data = {key: clean_json_value(value) for key, value in row.to_dict().items()}
            missing_cols = [col for col in main_missing_check_cols if pd.isna(row.get(col))]
            new_patients_list.append({
                "code": patient_code,
                "data": cleaned_row_data,
                "missing_columns": missing_cols
            })
        
        return JSONResponse(content={
            "status": "new_patients_found",
            "message": f"Обнаружено {len(new_codes)} новых пациентов",
            "new_patients": new_patients_list,
            "new_codes": list(new_codes)
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при обработке файла: {str(e)}")

@router.post("/fill-synthetic-patient")
async def fill_synthetic_patient(body: Dict[str, Any]):
    data = body.get("data")
    if not data:
        raise HTTPException(status_code=400, detail="Данные пациента не предоставлены")
    
    try:
        df_row = pd.DataFrame([data])
        df_row.rename(columns=inverse_column_dict, inplace=True)
        
        df_row = fill_missing_with_sums_and_synthetic(df_row)
        
        df_row.rename(columns=column_dict, inplace=True)
        
        filled_data = {key: clean_json_value(value) for key, value in df_row.iloc[0].to_dict().items()}
        
        return JSONResponse(content={"data": filled_data})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при заполнении синтетикой: {str(e)}")

@router.post("/upload-new-patients-data")
async def upload_new_patients_data(body: List[Dict[str, Any]]):
    try:
        if not body:
            raise HTTPException(status_code=400, detail="Данные пациентов не предоставлены")
        
        df = pd.DataFrame([p["data"] for p in body])
        
        column_mapping = get_column_mapping()
        
        rename_mapping = {}
        for original_col in df.columns:
            if original_col in column_mapping:
                rename_mapping[original_col] = column_mapping[original_col]
        
        if rename_mapping:
            df = df.rename(columns=rename_mapping)
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        try:
            cur.execute(f"""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = '{BASE_TABLE}'
                ORDER BY ordinal_position
            """)
            
            table_columns = cur.fetchall()
            existing_columns = {col[0]: col[1] for col in table_columns}
            
            insert_columns = [col for col in df.columns if col in existing_columns]
            
            if not insert_columns:
                raise HTTPException(status_code=400, detail="Не найдено совпадающих колонок для вставки")
            
            col_sql_types = []
            for col in insert_columns:
                db_type = existing_columns[col]
                if db_type in ['integer', 'bigint']:
                    col_sql_types.append('INTEGER')
                elif db_type in ['real', 'double precision', 'numeric']:
                    col_sql_types.append('FLOAT')
                elif db_type == 'date':
                    col_sql_types.append('DATE')
                else:
                    col_sql_types.append('TEXT')
            
            columns_list_sql = ','.join([f'"{c}"' for c in insert_columns])
            insert_sql = f'INSERT INTO {BASE_TABLE} ({columns_list_sql}) VALUES %s'
            
            insert_data = []
            for _, row in df.iterrows():
                row_data = [prepare_cell(row.get(col), col_sql_types[i]) for i, col in enumerate(insert_columns)]
                insert_data.append(tuple(row_data))
            
            if insert_data:
                execute_values(cur, insert_sql, insert_data, page_size=BATCH_SIZE)
                conn.commit()
            
            uploaded_count = len(insert_data)
            
            return JSONResponse(content={
                "status": "success",
                "message": f"Успешно загружено {uploaded_count} новых пациентов",
                "uploaded_count": uploaded_count
            })
            
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=500, detail=f"Ошибка при загрузке в БД: {str(e)}")
            
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()