# backend/routers/doctor.py

import os
import re
import requests
from datetime import datetime
from typing import Optional, Union, List
from fastapi import HTTPException, Depends, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float, MetaData, Table, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel, validator
import pandas as pd
import numpy as np
from dotenv import load_dotenv

# Загружаем переменные окружения из файла .env
load_dotenv()

# --- Конфигурация ---
DATABASE_URL = os.getenv("DATABASE_URL")
BASE_TABLE = "fa_rgnkc_data"

# Гибкий URL для модели
ML_MODEL_URL = os.getenv('ML_MODEL_URL', 'http://127.0.0.1:8080')
MODEL_ENDPOINT = f"{ML_MODEL_URL}/predict_ensemble"

# --- Настройка БД ---
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- Pydantic модели ---
class PatientInfo(BaseModel):
    code: int
    patient_info: str
    
    class Config:
        from_attributes = True

class PredictionResponse(BaseModel):
    message: str
    updated_count: int
    failed_predictions: List[dict] = []

class ModelPredictionRequest(BaseModel):
    values: List[float]

# --- Вспомогательные функции ---

def extract_numeric_value(value) -> Optional[float]:
    """Извлекает числовое значение из различных форматов данных"""
    if pd.isna(value) or value is None:
        return None
    
    if isinstance(value, (int, float)):
        return float(value)
    
    if isinstance(value, str):
        value = value.strip()
        if not value:
            return None
            
        # Попробуем найти числа с плавающей точкой
        match_float = re.search(r'([-+]?\d+[,.]\d+)', value)
        if match_float:
            return float(match_float.group(1).replace(',', '.'))
        
        # Затем целые числа
        match_int = re.search(r'([-+]?\d+)', value)
        if match_int:
            return float(match_int.group(1))
        
        # Простые числовые строки
        if re.fullmatch(r'[-+]?\d+(\.\d+)?', value):
            return float(value)
    
    return None

def transform_col_58(value) -> Optional[float]:
    """Преобразование значений col_58 в числовые"""
    if pd.isna(value) or value is None:
        return None
    
    value_str = str(value).strip()
    mapping = {
        '<1 раза в месяц': 0.0,
        '<1 раза в неделю': 1.0,
        '1 раз в неделю': 2.0,
        '2-3 раза в неделю': 3.0,
        'Ежедневно': 4.0
    }
    
    return mapping.get(value_str, None)

def transform_col_59(value) -> Optional[float]:
    """Преобразование значений col_59 в числовые"""
    if pd.isna(value) or value is None:
        return None
    
    value_str = str(value).strip()
    mapping = {
        '<30 мин': 0.0,
        '30-60 мин': 1.0,
        '1-4 часа': 2.0,
        '>4 часов': 3.0
    }
    
    return mapping.get(value_str, None)

def transform_col_232(value) -> Optional[float]:
    """Преобразование значений col_232"""
    if pd.isna(value) or value is None:
        return None
    
    try:
        # Преобразуем в float
        val = float(value)
        if not (0.0 <= val <= 100.0):
            return None
        
        # Округляем до ближайшего кратного 5
        rounded_val = round(val / 5.0) * 5.0
        
        return rounded_val
    except ValueError:
        return None

def transform_col_249(value) -> Optional[int]:
    """Преобразование значений col_249"""
    if pd.isna(value) or value is None:
        return None
    
    try:
        # Преобразуем в float и проверяем диапазон
        val = float(value)
        if 0.0 <= val <= 12.0 and val.is_integer():
            return int(val)
        else:
            return None
    except ValueError:
        return None

def transform_col_245(value) -> Optional[int]:
    if pd.isna(value) or value is None:
        return None
    
    # Если значение уже число (int или float) в диапазоне 0-4, возвращаем его как int
    if isinstance(value, (int, float)):
        if 0 <= value <= 4:
            return int(value)
        else:
            return None
    
    value_str = str(value).strip()
    
    if value_str == '0 - не может выполнить':
        return 0
    elif value_str in ['1 - ≥8,71', '≥8,71']:
        return 1
    elif value_str in ['2 - 6,21–8,70', '6,21–8,70']:
        return 2
    elif value_str in ['3 - 4,82–6,20', '4,82–6,20']:
        return 3
    elif value_str in ['4 - ≤4,81', '≤4,81']:
        return 4
    
    return None

def validate_and_prepare_features(row) -> Optional[List[float]]:
    try:
        # 1. col_14 (float, 0.0-7.0)
        val1 = extract_numeric_value(row.get('col_14'))
        if val1 is None or not (0.0 <= val1 <= 7.0):
            print(f"Ошибка в col_14 для patient_id {row.get('col_1')}: val={row.get('col_14')}")
            return None
        
        # 2. col_58 (преобразование строк, 0.0-4.0)
        val2 = transform_col_58(row.get('col_58'))
        if val2 is None or not (0.0 <= val2 <= 4.0):
            print(f"Ошибка в col_58 для patient_id {row.get('col_1')}: val={row.get('col_58')}")
            return None
        
        # 3. col_59 (преобразование строк, 0.0-3.0)
        val3 = transform_col_59(row.get('col_59'))
        if val3 is None or not (0.0 <= val3 <= 3.0):
            print(f"Ошибка в col_59 для patient_id {row.get('col_1')}: val={row.get('col_59')}")
            return None
        
        # 4. col_85 (numeric)
        val4 = extract_numeric_value(row.get('col_85'))
        if val4 is None:
            print(f"Ошибка в col_85 для patient_id {row.get('col_1')}: val={row.get('col_85')}")
            return None
        
        # 5. col_232 (специальное преобразование)
        val5 = transform_col_232(row.get('col_232'))
        if val5 is None:
            print(f"Ошибка в col_232 для patient_id {row.get('col_1')}: val={row.get('col_232')}")
            return None
        
        # 6. col_249 (специальное преобразование, 0-12)
        val6 = transform_col_249(row.get('col_249'))
        if val6 is None or not (0 <= val6 <= 12):
            print(f"Ошибка в col_249 для patient_id {row.get('col_1')}: val={row.get('col_249')}")
            return None
        
        # 7. col_252 (float64)
        val7 = extract_numeric_value(row.get('col_252'))
        if val7 is None:
            print(f"Ошибка в col_252 для patient_id {row.get('col_1')}: val={row.get('col_252')}")
            return None
        
        # 8. col_245 (специальное преобразование, 0-4)
        val8 = transform_col_245(row.get('col_245'))
        if val8 is None or not (0 <= val8 <= 4):
            print(f"Ошибка в col_245 для patient_id {row.get('col_1')}: val={row.get('col_245')}")
            return None
        
        print(f"Успешно подготовлены признаки для patient_id {row.get('col_1')}: {val1, val2, val3, val4, val5, val6, val7, val8}")
        return [float(val1), float(val2), float(val3), float(val4), 
                float(val5), float(val6), float(val7), float(val8)]
    
    except Exception as e:
        print(f"Ошибка при подготовке признаков для patient_id {row.get('col_1')}: {e}")
        return None

def call_prediction_model(features: List[float]) -> Optional[int]:
    """Вызывает модель предсказания"""
    try:
        payload = {"values": features}
        response = requests.post(MODEL_ENDPOINT, json=payload, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            # Проверяем 'predicted_class', 'prediction' или 'class'
            if isinstance(result, dict):
                return result.get('predicted_class', result.get('prediction', result.get('class', None)))
            elif isinstance(result, (int, float)):
                return int(result)
        else:
            print(f"Ошибка модели: {response.status_code}, {response.text}")
            return None
    
    except Exception as e:
        print(f"Ошибка при вызове модели: {e}")
        return None

# --- Инициализация FastAPI Router ---
router = APIRouter()

# --- Зависимость для БД ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Роутеры ---
@router.get("/patients", response_model=List[PatientInfo])
def get_patients_info(db: Session = Depends(get_db)):
    """Получить список пациентов с основной информацией."""
    try:
        # Получаем данные пациентов из правильных столбцов
        stmt = text(f'''
            SELECT 
                col_1 as patient_code,
                col_2 as patient_gender, 
                fa
            FROM {BASE_TABLE} 
            ORDER BY col_1 ASC
        ''')
        patients_raw = db.execute(stmt).mappings().all()

        if not patients_raw:
            raise HTTPException(status_code=404, detail="Пациенты не найдены")

        results = []
        for p in patients_raw:
            # Формируем информационную строку в формате: "Пол, Физ.активность"
            gender = p['patient_gender'] if p['patient_gender'] is not None else 'Н/Д'
            
            # Обрабатываем fa - если None или пустое, то "Не определён"
            fa_value = p['fa']
            if fa_value is None:
                activity = 'Не определён'
            else:
                # Преобразуем числовое значение в текстовое описание уровня
                activity = level_map.get(int(fa_value), f'Класс {fa_value}')
            
            info = f"{gender}, {activity}"
            
            # Используем col_1 как код пациента
            patient_code = p['patient_code']
            results.append(PatientInfo(code=patient_code, patient_info=info))

        return results
    
    except Exception as e:
        print(f"Ошибка при получении списка пациентов: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка получения данных: {str(e)}")

@router.post("/predict-activity", response_model=PredictionResponse)
def predict_and_update_activity(db: Session = Depends(get_db)):
    """Предсказывает уровень ФА для всех пациентов и обновляет столбец 'fa'."""
    try:
        # 1. Получаем все необходимые данные из БД
        required_columns = ['col_1', 'col_14', 'col_58', 'col_59', 'col_85', 
                          'col_232', 'col_249', 'col_252', 'col_245']
        
        columns_str = ", ".join([f'"{col}"' if col != 'col_1' else col for col in required_columns])
        stmt = text(f'SELECT {columns_str} FROM {BASE_TABLE} ORDER BY col_1 ASC')
        data_raw = db.execute(stmt).mappings().all()

        if not data_raw:
            raise HTTPException(status_code=404, detail="Нет данных для предсказания.")

        updated_count = 0
        failed_predictions = []

        # 2. Обрабатываем каждого пациента
        for row in data_raw:
            patient_id = row['col_1']  # Используем col_1 как идентификатор пациента
            
            # Подготавливаем признаки
            features = validate_and_prepare_features(dict(row))
            
            if features is None:
                failed_predictions.append({
                    'patient_id': patient_id,
                    'reason': 'Невалидные или отсутствующие данные'
                })
                continue
            
            # Вызываем модель
            predicted_class = call_prediction_model(features)
            
            if predicted_class is None:
                failed_predictions.append({
                    'patient_id': patient_id,
                    'reason': 'Ошибка предсказания модели'
                })
                continue
            
            # Обновляем запись в БД - записываем числовое значение класса
            update_stmt = text(f'UPDATE {BASE_TABLE} SET fa = :fa_class WHERE col_1 = :patient_id')
            result = db.execute(update_stmt, {
                "fa_class": int(predicted_class),  # Записываем как число, а не строку
                "patient_id": patient_id
            })
            
            if result.rowcount > 0:
                updated_count += 1

        # Фиксируем изменения
        db.commit()
        
        response_message = f"Обработано пациентов: {len(data_raw)}. Успешно обновлено: {updated_count}."
        if failed_predictions:
            response_message += f" Неудачных предсказаний: {len(failed_predictions)}."

        return PredictionResponse(
            message=response_message,
            updated_count=updated_count,
            failed_predictions=failed_predictions
        )

    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        print(f"Ошибка во время предсказания/обновления: {e}")
        raise HTTPException(status_code=500, detail=f"Внутренняя ошибка сервера: {str(e)}")

@router.get("/test-model")
def test_model_connection():
    """Тестирует подключение к модели предсказания."""
    test_features = [6.0, 4.0, 1.0, 32.0, 100.0, 9.0, 9.25, 2.0]
    
    try:
        result = call_prediction_model(test_features)
        if result is not None:
            return {"status": "success", "test_prediction": result}
        else:
            return {"status": "error", "message": "Модель вернула None"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# --- Совместимость со старыми импортами ---
# Эти переменные нужны для level_fa.py и других модулей
prediction_model = None  # В новой версии мы не используем локальную модель
model_expected_db_cols_ordered = ['col_14', 'col_58', 'col_59', 'col_85', 'col_232', 'col_249', 'col_252', 'col_245']
level_map = {
    1: "Низкий(1 ур.)",
    2: "Ниже среднего(2 ур.)",
    3: "Средний(3 ур.)",
    4: "Выше среднего(4 ур.)",
    5: "Высокий(5 ур.)"
}

@router.get("/test-db")
def test_database_connection(db: Session = Depends(get_db)):
    """Тестирует подключение к базе данных."""
    try:
        # Проверяем подключение и наличие таблицы
        stmt = text(f'SELECT COUNT(*) as count FROM {BASE_TABLE} LIMIT 1')
        result = db.execute(stmt).scalar()
        return {"status": "success", "table_exists": True, "sample_count": result}
    except Exception as e:
        return {"status": "error", "message": str(e)}