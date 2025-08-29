# backend/routers/level_fa.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.sql import text
from backend.routers.doctor import (
    get_db, level_map, extract_numeric_value, 
    transform_col_58, transform_col_59, transform_col_232, 
    transform_col_249, transform_col_245, call_prediction_model,
    validate_and_prepare_features, BASE_TABLE
)
import pandas as pd
import numpy as np
from pydantic import BaseModel
import logging
import requests
from typing import List

# Логгирование
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# Pydantic модели должны быть определены ДО их использования в роутерах
class SinglePredictionRequest(BaseModel):
    code: int

class SinglePredictionResponse(BaseModel):
    message: str
    activity_level: str

class ManualPredictionRequest(BaseModel):
    col_14: float
    col_58: str
    col_59: str
    col_85: float
    col_232: float
    col_249: int
    col_252: float
    col_245: str

class SaveResultRequest(BaseModel):
    code: int
    fa_level: int

class SaveLFKRequest(BaseModel):
    code: int
    lfk_level: int

class ModelPredictionRequest(BaseModel):
    values: List[float]

class ModelPredictionResponse(BaseModel):
    predicted_class: int

def transform_col_245_for_display(value):
    """Преобразование числового значения col_245 в текстовое описание для отображения"""
    if value is None:
        return None
    
    try:
        value_int = int(value)
        mapping = {
            0: "Не может выполнить",
            1: "≥8,71 с",
            2: "6,21–8,70 с",
            3: "4,82–6,20 с", 
            4: "≤4,81 с"
        }
        return mapping.get(value_int, "Неизвестно")
    except (ValueError, TypeError):
        return "Неизвестно"

# Теперь все модели определены, можно использовать их в роутерах
@router.get("/patients")
def get_all_patients(db: Session = Depends(get_db)):
    """Returns a list of all patients with their codes and gender."""
    try:
        logger.info("Fetching all patients")
        stmt = text(f'SELECT col_1 AS code, col_2 AS gender FROM {BASE_TABLE} ORDER BY col_1 ASC')
        result = db.execute(stmt).fetchall()
        patients = [{"code": row.code, "gender": row.gender or "N/A"} for row in result]
        logger.info(f"Retrieved {len(patients)} patients")
        return patients
    except Exception as e:
        logger.error(f"Error fetching patients: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

@router.get("/patients/{code}")
def get_patient_by_code(code: int, db: Session = Depends(get_db)):
    """Returns patient data by code with all needed columns."""
    try:
        logger.info(f"Fetching patient with code {code}")
        stmt = text(f'''
            SELECT col_1 AS code, col_2 AS gender, col_14, col_58, col_59, col_85, 
                   col_232, col_249, col_252, col_245, fa AS activity_level 
            FROM {BASE_TABLE} WHERE col_1 = :code
        ''')
        result = db.execute(stmt, {"code": code}).mappings().first()
        
        if not result:
            logger.warning(f"Patient with code {code} not found")
            raise HTTPException(status_code=404, detail=f"Patient with code {code} not found")
        
        # Преобразуем результат в словарь
        patient_data = dict(result)
        
        return patient_data
    except Exception as e:
        logger.error(f"Error fetching patient {code}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

@router.post("/predict-activity-single", response_model=SinglePredictionResponse)
def predict_activity_single(request: SinglePredictionRequest, db: Session = Depends(get_db)):
    """Predicts physical activity level for a single patient using the new model."""
    try:
        logger.info(f"Predicting for patient with code {request.code}")
        
        # Получаем данные пациента из БД
        required_columns = ['col_1', 'col_14', 'col_58', 'col_59', 'col_85', 
                          'col_232', 'col_249', 'col_252', 'col_245']
        
        columns_str = ", ".join([f'"{col}"' if col != 'col_1' else col for col in required_columns])
        stmt = text(f'SELECT {columns_str} FROM {BASE_TABLE} WHERE col_1 = :code')
        data_raw = db.execute(stmt, {"code": request.code}).mappings().fetchone()

        if not data_raw:
            logger.warning(f"Patient with code {request.code} not found")
            raise HTTPException(status_code=404, detail=f"Patient with code {request.code} not found.")

        # Подготавливаем признаки для модели
        features = validate_and_prepare_features(dict(data_raw))
        
        if features is None:
            logger.error(f"Failed to prepare features for patient {request.code}")
            raise HTTPException(status_code=400, detail="Невалидные или отсутствующие данные для предсказания.")

        # Вызываем модель предсказания
        predicted_class = call_prediction_model(features)
        
        if predicted_class is None:
            logger.error(f"Model prediction failed for patient {request.code}")
            raise HTTPException(status_code=500, detail="Ошибка предсказания модели.")

        activity_str = level_map.get(predicted_class, "Ошибка предсказания")
        logger.info(f"Predicted activity level for {request.code}: {activity_str}")

        return SinglePredictionResponse(
            message="Уровень физической активности успешно оценён.",
            activity_level=activity_str
        )

    except HTTPException as e:
        logger.error(f"HTTP error: {str(e)}")
        raise e
    except Exception as e:
        logger.error(f"Internal error predicting for {request.code}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/predict-activity-manual", response_model=SinglePredictionResponse)
def predict_activity_manual(request: ManualPredictionRequest):
    """Predicts physical activity level based on manually entered parameters."""
    try:
        logger.info("Predicting activity level with manually entered parameters")
        
        # Преобразуем входные данные в формат для модели
        transformed_data = {
            'col_1': 1,
            'col_14': request.col_14,
            'col_58': request.col_58,
            'col_59': request.col_59,
            'col_85': request.col_85,
            'col_232': request.col_232,
            'col_249': request.col_249,
            'col_252': request.col_252,
            'col_245': request.col_245
        }

        # Подготавливаем признаки для модели
        features = validate_and_prepare_features(transformed_data)
        
        if features is None:
            logger.error("Failed to prepare features for manual input")
            raise HTTPException(status_code=400, detail="Невалидные входные данные.")

        # Вызываем модель предсказания
        predicted_class = call_prediction_model(features)
        
        if predicted_class is None:
            logger.error("Model prediction failed for manual input")
            raise HTTPException(status_code=500, detail="Ошибка предсказания модели.")

        activity_str = level_map.get(predicted_class, "Ошибка предсказания")
        logger.info(f"Predicted activity level with manual input: {activity_str}")

        return SinglePredictionResponse(
            message="Уровень физической активности успешно оценён на основе введённых параметров.",
            activity_level=activity_str
        )

    except HTTPException as e:
        logger.error(f"HTTP error: {str(e)}")
        raise e
    except Exception as e:
        logger.error(f"Error predicting with manual input: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/save-fa-result")
def save_fa_result(request: SaveResultRequest, db: Session = Depends(get_db)):
    """Saves FA result to database."""
    try:
        logger.info(f"Saving FA result for patient {request.code}: {request.fa_level}")
        
        update_stmt = text(f'UPDATE {BASE_TABLE} SET fa = :fa_level WHERE col_1 = :code')
        result = db.execute(update_stmt, {"fa_level": request.fa_level, "code": request.code})
        db.commit()

        if result.rowcount == 0:
            logger.warning(f"Failed to update FA for patient {request.code}")
            raise HTTPException(status_code=404, detail="Patient not found")

        return {"message": "Результат успешно сохранён"}
    
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving FA result: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/save-lfk-result")
def save_lfk_result(request: SaveLFKRequest, db: Session = Depends(get_db)):
    """Saves LFK result to database."""
    try:
        logger.info(f"Saving LFK result for patient {request.code}: {request.lfk_level}")
        
        update_stmt = text(f'UPDATE {BASE_TABLE} SET lfk = :lfk_level WHERE col_1 = :code')
        result = db.execute(update_stmt, {"lfk_level": request.lfk_level, "code": request.code})
        db.commit()

        if result.rowcount == 0:
            logger.warning(f"Failed to update LFK for patient {request.code}")
            raise HTTPException(status_code=404, detail="Patient not found")

        return {"message": "Результат ЛФК успешно сохранён"}
    
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving LFK result: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/predict-model", response_model=ModelPredictionResponse)
def predict_model_direct(request: ModelPredictionRequest):
    """Direct prediction using model endpoint with values array."""
    try:
        logger.info("Direct model prediction with values array")
        
        # Вызываем модель предсказания напрямую
        predicted_class = call_prediction_model(request.values)
        
        if predicted_class is None:
            logger.error("Model prediction failed for direct input")
            raise HTTPException(status_code=500, detail="Ошибка предсказания модели.")

        return ModelPredictionResponse(predicted_class=predicted_class)

    except Exception as e:
        logger.error(f"Error in direct model prediction: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")