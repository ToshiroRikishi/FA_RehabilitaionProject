# backend/routers/patient_program.py

from fastapi import APIRouter, HTTPException
from sqlalchemy import create_engine, text
from sqlalchemy.engine import ResultProxy
from sqlalchemy.exc import SQLAlchemyError
import logging
from typing import Dict, List, Any
import os
from dotenv import load_dotenv

# Загружаем переменные окружения из файла .env
load_dotenv()

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Подключение к базе данных
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

router = APIRouter(prefix="/patient-program", tags=["patient-program"])

def generate_rehabilitation_program(patient_data: Dict[str, Any]) -> Dict[str, List[str]]:
    """
    Генерация индивидуальной программы реабилитации на основе данных пациента
    """
    program = {
        "vaccination": [],
        "swallowing_issues": [],
        "assistive_devices": [],
        "mobility": [],
        "mental_health": [],
        "sleep": [],
        "osteoporosis": [],
        "physical_activity": [],
        "social_support": [],
        "lifestyle_modification": [],
        "nutrition": [],
        "additional_recommendations": []
    }
    
    # 1. Вакцинация (рекомендация для всех)
    program["vaccination"].append("Ежегодная ревакцинация от Covid-19 и гриппа перед эпидемическим сезоном")
    
    # Проверка групп риска для дополнительной вакцинации
    chronic_diseases = patient_data.get("col_40") or ""  # Защита от None: fallback на ""
    risk_groups = [
        "ХОБЛ", "эмфизема", "ИБС", "сердечная недостаточность", "кардиомиопатии", 
        "Сахарный диабет", "Бронхиальная астма", "цирроз", "ХБП", "ХСН"
    ]
    
    is_risk_group = any(disease in chronic_diseases for disease in risk_groups)
    age = patient_data.get("col_3")
    if is_risk_group or (age is not None and age >= 65):  # Добавлена проверка на None для age
        program["vaccination"].append("Последовательное введение вакцин: 1-я доза, через 8 недель 2-я доза. Ревакцинация через 5 лет")
    
    # 2. Дисфагия
    dysphagia = patient_data.get("col_366")
    if dysphagia == 1:
        program["swallowing_issues"].append("Консультация логопеда")
        program["swallowing_issues"].append("Артикуляционная гимнастика")
    
    # 3. Вспомогательные средства
    assistive_devices = patient_data.get("col_67") or ""  # Защита от None
    if assistive_devices:
        program["assistive_devices"].append(f"Продолжение использования вспомогательных средств: {assistive_devices}")
        
        # Проверка зрения и слуха
        vision_hearing_issue = patient_data.get("col_8")
        if "очки" in assistive_devices or vision_hearing_issue == 1:
            program["assistive_devices"].append("Консультация офтальмолога для решения вопроса о хирургической коррекции зрения")
        
        if "слуховой аппарат" in assistive_devices or vision_hearing_issue == 1:
            program["assistive_devices"].append("Консультация сурдолога")
            program["assistive_devices"].append("Артикуляционная гимнастика")
        
        if "съемные зубные протезы" in assistive_devices or patient_data.get("col_365") == 1:
            program["assistive_devices"].append("Консультация стоматолога")
        
        if "абсорбирующее белье" in assistive_devices or patient_data.get("col_12") == 1:
            program["assistive_devices"].append("Упражнения Кегеля")
    
    # 4. Мобильность (SPPB)
    sppb_score = patient_data.get("col_249")
    if sppb_score is not None and sppb_score <= 3:
        if "трость" not in assistive_devices and "костыли" not in assistive_devices and "ходунки" not in assistive_devices:
            program["mobility"].append("Рассмотрение возможности применения ходунков")
    
    # 5. Психическое здоровье
    depression_question = patient_data.get("col_10")  # Чувствуете ли вы себя подавленным
    # GDS-15 Прописать логику: находится в Диагнозе
    
    if depression_question == 1:
        program["mental_health"].append("Рекомендации по управлению эмоциональным состоянием")
        program["mental_health"].append("Консультация психолога")
        program["mental_health"].append("Занятия в группе")
    
    # 6. Сон (Индекс тяжести инсомнии)
    # Прописать логику: находится в Диагнозе
    
    # 7. Остеопороз
    densitometry_conclusion = patient_data.get("col_82") or ""  # Защита от None
    if densitometry_conclusion in ["Остеопороз", "Остеопения"]:
        program["osteoporosis"].append("Ежегодное проведение денситометрии двух зон (позвоночник+бедренная кость) для контроля изменений в динамике")
    
    # 8. Физическая активность (общие рекомендации)
    program["physical_activity"].append("Физическая активность 30 минут в день или 3 раза в неделю по 50 минут (150 минут в неделю)")
    program["physical_activity"].append("Силовые тренировки 2 и более дней в неделю для сохранения мышечной массы")
    program["physical_activity"].append("Тренировки на сохранение баланса 3 и более дней в неделю для профилактики риска падений")
    program["physical_activity"].append("Аэробные нагрузки не менее 10 минут в день")
    
    # Индивидуальные рекомендации по физической активности
    # (реализовать на основе конкретных условий пациента)
    
    # 9. Социальная поддержка
    barthel_score = patient_data.get("col_232")
    lives_alone = patient_data.get("col_21") == "Один"  # Если None, будет False, что ок, но для consistency: patient_data.get("col_21") or "" == "Один"
    lives_alone = (patient_data.get("col_21") or "") == "Один"  # Добавлена защита
    
    program["social_support"].append("Участие в программах активного долголетия")
    
    if barthel_score is not None and barthel_score < 100 and lives_alone:
        program["social_support"].append("Рекомендовано включение в системы долговременного ухода")
    
    # 10. Модификация образа жизни
    smoking = patient_data.get("col_52") or ""  # Защита от None
    if smoking in ["Курит", "Курил в прошлом"]:
        program["lifestyle_modification"].append("Отказ от курения с профессиональной поддержкой")
    
    alcohol = patient_data.get("col_56") or ""  # Защита от None
    if alcohol == "Да":
        program["lifestyle_modification"].append("Отказ от употребления алкоголя или сокращение его количества")
    
    # 11. Питание
    mna_score = patient_data.get("col_279")
    if mna_score is not None:
        if mna_score > 23.5:
            program["nutrition"].append("Нормальный пищевой статус: поддерживать текущий режим питания")
        elif 17 <= mna_score <= 23.5:
            program["nutrition"].append("Риск недостаточности питания: увеличить потребление белка до 1.5-2 г/кг")
        else:
            program["nutrition"].append("Недостаточность питания: увеличить потребление белка до 2.0 г/кг, рассмотреть сипинг")
    
    # Дополнительные рекомендации по питанию
    program["nutrition"].append("Принимать пищу не реже 4-5 раз в день в одно и то же время")
    program["nutrition"].append("Интервал между ужином и сном - не менее 3.5 часов")
    program["nutrition"].append("Употребление воды не менее 1.6 л/сут (женщинам) и 2 л/сут (мужчинам)")
    
    # 12. Дополнительные рекомендации на основе конкретных условий
    # (можно добавить больше условий на основе данных пациента)
    
    return program

@router.get("/{patient_code}")
async def get_patient_program(patient_code: int):
    # Запрос к базе данных для получения всех данных по коду карты пациента
    query = text("SELECT * FROM fa_rgnkc_data WHERE col_1 = :patient_code")
    
    try:
        with engine.connect() as connection:
            result: ResultProxy = connection.execute(query, {"patient_code": patient_code})
            row = result.fetchone()
            if row is None:
                raise HTTPException(status_code=404, detail="Patient not found")
            
            # Преобразуем строку в словарь
            columns = result.keys()
            patient_data = dict(zip(columns, row))
            
            # Генерируем программу реабилитации
            rehabilitation_program = generate_rehabilitation_program(patient_data)
            
            # Добавляем общую информацию о пациенте
            response = {
                "patient_info": {
                    "code": patient_data.get("col_1"),
                    "gender": patient_data.get("col_2") or "Не указано",
                    "age": patient_data.get("col_3"),
                    "screening_number": patient_data.get("col_4") or "Не указано",
                    "status": patient_data.get("col_5") or "Не указано",
                    "group": patient_data.get("col_6") or "Не указано"
                },
                "rehabilitation_program": rehabilitation_program
            }
            
            return response
            
    except SQLAlchemyError as e:
        logger.error(f"Database error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except TypeError as e:  # Специфическая обработка TypeError (для None в данных)
        logger.error(f"Data type error: {str(e)} - Possibly NULL values in patient data")
        raise HTTPException(status_code=500, detail="Ошибка обработки данных пациента: некорректные значения в БД")
    except Exception as e:  # Общий catch-all
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail="Внутренняя ошибка сервера")