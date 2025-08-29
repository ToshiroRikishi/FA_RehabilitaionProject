# backend/routers/patient_card.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import create_engine, text
from sqlalchemy.engine import ResultProxy
from sqlalchemy.exc import SQLAlchemyError
import logging
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

router = APIRouter(prefix="/patient-card", tags=["patient-card"])

def interpret_barthel_score(score):
    """Интерпретация шкалы Бартел"""
    if score is None:
        return "Нет данных"
    if score <= 20:
        return "Полная зависимость"
    elif score <= 60:
        return "Выраженная зависимость"
    elif score <= 90:
        return "Умеренная зависимость"
    elif score <= 99:
        return "Легкая зависимость в повседневной жизни"
    else:
        return "Нет зависимости"

def interpret_lawton_score(score):
    """Интерпретация шкалы Лоутон"""
    if score is None:
        return "Нет данных"
    return "Зависим от посторонней помощи" if score < 8 else "Независим"

def interpret_mmse_score(score):
    """Интерпретация шкалы MMSE"""
    if score is None:
        return "Нет данных"
    if score >= 28:
        return "Норма"
    elif score >= 25:
        return "Недементные когнитивные расстройства"
    elif score >= 20:
        return "Деменция легкой степени"
    elif score >= 11:
        return "Деменция умеренной степени"
    else:
        return "Тяжелая деменция"

def interpret_moca_score(score):
    """Интерпретация шкалы MOCA"""
    if score is None:
        return "Нет данных"
    if score >= 22:
        return "Легкая степень когнитивных нарушений"
    elif score >= 10:
        return "Средняя степень когнитивных нарушений"
    else:
        return "Тяжелая степень когнитивных нарушений"

def interpret_age_not_obstacle_score(score):
    """Интерпретация шкалы 'Возраст не помеха'"""
    if score is None:
        return "Нет данных"
    if score <= 2:
        return "Нет старческой астении"
    elif score <= 4:
        return "Вероятная преастения"
    else:
        return "Вероятная старческая астения"

def interpret_sppb_score(score, age_not_obstacle_score):
    """Интерпретация шкалы SPPB"""
    if score is None or age_not_obstacle_score is None:
        return "Нет данных"
    
    if score >= 10 and age_not_obstacle_score <= 3:
        return "5 уровень"
    elif 8 <= score <= 9 and 3 <= age_not_obstacle_score <= 4:
        return "4 уровень"
    elif 8 <= score <= 9 and 3 <= age_not_obstacle_score <= 4:
        return "3 уровень"
    elif 4 <= score <= 7 and (3 <= age_not_obstacle_score <= 4 or age_not_obstacle_score >= 5):
        return "2 уровень"
    elif 4 <= score <= 7 and (3 <= age_not_obstacle_score <= 4 or age_not_obstacle_score >= 5):
        return "1 уровень"
    else:
        return "Не определен"

def interpret_mna_score(score):
    """Интерпретация шкалы MNA"""
    if score is None:
        return "Нет данных"
    if score > 23.5:
        return "Нормальный пищевой статус"
    elif score >= 17:
        return "Риск недостаточности питания"
    else:
        return "Недостаточность питания"

def interpret_dynamometry(gender, score):
    """Интерпретация динамометрии"""
    if score is None or gender is None:
        return "Нет данных"
    
    if gender == 'Муж':
        threshold = 27
    else:
        threshold = 16
    
    return "Саркопения есть" if score < threshold else "Саркопении нет"

def interpret_get_up_and_go_score(score):
    """Интерпретация теста 'Встань и иди'"""
    if score is None:
        return "Нет данных"
    if score <= 10:
        return "Норма"
    elif score >= 14:
        return "Риск падений"
    else:
        return "Промежуточный результат"

def interpret_pain_score(score):
    """Интерпретация визуально-аналоговой шкалы боли"""
    if score is None:
        return "Нет данных"
    if score == 0:
        return "Нет нарушений"
    elif score <= 3:
        return "Легкая боль"
    elif score <= 6:
        return "Умеренная боль"
    elif score <= 8:
        return "Выраженная боль"
    else:
        return "Невыносимая боль"

@router.get("/{patient_code}")
async def get_patient_card(patient_code: int):
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
            
            # Получаем пол пациента для интерпретации динамометрии
            gender = patient_data.get("col_2")
            
            # Формируем обобщённую оценку по шкалам
            scale_interpretations = {
                "Шкала Бартел (ADL)": {
                    "score": patient_data.get("col_232"),
                    "interpretation": interpret_barthel_score(patient_data.get("col_232"))
                },
                "Шкала Лоутон (IADL)": {
                    "score": patient_data.get("col_241"),
                    "interpretation": interpret_lawton_score(patient_data.get("col_241"))
                },
                "Краткая шкала оценки психического статуса (MMSE)": {
                    "score": patient_data.get("col_290"),
                    "interpretation": interpret_mmse_score(patient_data.get("col_290"))
                },
                "Шкала MOCA": {
                    "score": patient_data.get("col_304"),
                    "interpretation": interpret_moca_score(patient_data.get("col_304"))
                },
                "Возраст не помеха": {
                    "score": patient_data.get("col_14"),
                    "interpretation": interpret_age_not_obstacle_score(patient_data.get("col_14"))
                },
                "Краткая батарея тестов физического функционирования (SPPB)": {
                    "score": patient_data.get("col_249"),
                    "interpretation": interpret_sppb_score(
                        patient_data.get("col_249"), 
                        patient_data.get("col_14")
                    )
                },
                "Краткая шкала оценки питания (MNA)": {
                    "score": patient_data.get("col_279"),
                    "interpretation": interpret_mna_score(patient_data.get("col_279"))
                },
                "Динамометрия": {
                    "score": max(
                        patient_data.get("col_256") or 0,
                        patient_data.get("col_257") or 0,
                        patient_data.get("col_258") or 0,
                        patient_data.get("col_259") or 0
                    ),
                    "interpretation": interpret_dynamometry(
                        gender,
                        max(
                            patient_data.get("col_256") or 0,
                            patient_data.get("col_257") or 0,
                            patient_data.get("col_258") or 0,
                            patient_data.get("col_259") or 0
                        )
                    )
                },
                "Тест 'Встань и иди'": {
                    "score": patient_data.get("col_252"),
                    "interpretation": interpret_get_up_and_go_score(patient_data.get("col_252"))
                },
                "Визуально-аналоговая шкала оценки боли": {
                    "score": patient_data.get("col_48"),
                    "interpretation": interpret_pain_score(patient_data.get("col_48"))
                }
            }
            
            # Формируем ответ, группируя данные по категориям
            # Общая информация
            general_info = {
                "Код_карты_пациента": patient_data.get("col_1"),
                "Пол_пациента": patient_data.get("col_2"),
                "Возраст_пациента": patient_data.get("col_3"),
                "Скрининговый_номер_пациента": patient_data.get("col_4"),
                "Статус_пациента": patient_data.get("col_5"),
                "Группа_пациента": patient_data.get("col_6")
            }
            
            # Шкала "Возраст не помеха"
            age_not_obstacle = {
                "Похудели_ли_вы_на_5_кг_и_более_за_последние_6_месяцев": patient_data.get("col_7"),
                "Испытываете_ли_вы_какие-либо_ограничения_в_повседневной_жизни_из-за_снижения_зрения_или_слуха": patient_data.get("col_8"),
                "Были_ли_у_вас_в_течение_последнего_года_травмы__связанные_с_падением": patient_data.get("col_9"),
                "Чувствуете_ли_вы_себя_подавленным__грустным_или_встревоженным_на_протяжении_последних_недель": patient_data.get("col_10"),
                "Есть_ли_у_вас_проблемы_с_памятью__пониманием__ориентацией_или_способностью_планировать": patient_data.get("col_11"),
                "Страдаете_ли_вы_недержанием_мочи": patient_data.get("col_12"),
                "Испытываете_ли_вы_трудности_в_перемещении_по_дому_или_на_улице": patient_data.get("col_13"),
                "ВОЗРАСТ_НЕ_ПОМЕХА_количество_баллов": patient_data.get("col_14")
            }
            
            # Социальный анамнез
            social_history = {
                "Этаж_проживания": patient_data.get("col_15"),
                "Профессия": patient_data.get("col_16"),
                "Пользуется_лифтом": patient_data.get("col_17"),
                "Образование": patient_data.get("col_18"),
                "Семейный_статус": patient_data.get("col_19"),
                "Сфера_профессиональных_интересов": patient_data.get("col_20"),
                "С_кем_проживает": patient_data.get("col_21"),
                "Если_другое": patient_data.get("col_22"),
                "Работает": patient_data.get("col_23"),
                "Инвалидность": patient_data.get("col_24"),
                "Уровень_дохода": patient_data.get("col_25")
            }
            
            # Эпидемиологический анамнез
            epidemiological_history = {
                "Был_ли_перенесен_COVID": patient_data.get("col_26"),
                "В_каком_году_перенесен_COVID": patient_data.get("col_27"),
                "В_каком_месяце_перенесен_COVID": patient_data.get("col_28"),
                "Была_ли_госпитализация": patient_data.get("col_29"),
                "Было_ли_пребывание_в_ОРИТ": patient_data.get("col_30"),
                "Проводилась_ли_вакцинация_за_последние_12_месяцев": patient_data.get("col_31"),
                "Вакцинация_против_COVID-19": patient_data.get("col_32"),
                "Дата_вакцинации_(СOVID)": patient_data.get("col_33"),
                "Вакцинация_против_гриппа": patient_data.get("col_34"),
                "Дата_вакцинации_(Грипп)": patient_data.get("col_35"),
                "Вакцинация_против_пневмококка": patient_data.get("col_36"),
                "Дата_вакцинации_(Пневмококк)": patient_data.get("col_37"),
                "Вакцинация_против_других_заболеваний": patient_data.get("col_38"),
                "Другая_вакцинация": patient_data.get("col_39")
            }
            
            # Хронические заболевания
            chronic_diseases = {
                "Хронические_заболевания": patient_data.get("col_40"),
                "Стадия_ХБП_(при_наличии)": patient_data.get("col_41"),
                "Диагноз_при_выписке": patient_data.get("col_42")
            }
            
            # Хроническая боль
            chronic_pain = {
                "Хроническая_боль": patient_data.get("col_43"),
                "Локализация_боли": patient_data.get("col_44"),
                "Другая_локализация_боли": patient_data.get("col_45"),
                "Другая_локализация_боли_(уточнение)": patient_data.get("col_46"),
                "Прием_обезболивающих": patient_data.get("col_47"),
                "Число_баллов_по_ВАШ": patient_data.get("col_48")
            }
            
            # Госпитализация
            hospitalization = {
                "Частота_вызова_врача_на_дом_(за_год)": patient_data.get("col_49"),
                "Частота_вызова_СМП_(за_год)": patient_data.get("col_50"),
                "Частота_госпитализаций_(за_год)": patient_data.get("col_51")
            }
            
            # Факторы риска хронических неинфекционных заболеваний
            risk_factors = {
                "Курение": patient_data.get("col_52"),
                "Курит_на_протяжении_лет": patient_data.get("col_53"),
                "Курил_в_прошлом_на_протяжении_лет": patient_data.get("col_54"),
                "Количество_пачек_в_сутки": patient_data.get("col_55"),
                "Употребление_алкоголя_в_день": patient_data.get("col_56"),
                "Количество_единиц_алкоголя_в_день": patient_data.get("col_57"),
                "Физическая_активность_-_кратность": patient_data.get("col_58"),
                "Физическая_активность_-_продолжительность": patient_data.get("col_59"),
                "Варианты_физической_активности": patient_data.get("col_60"),
                "Другие_варианты_физической_активности": patient_data.get("col_61"),
                "Другая_физическая_активность": patient_data.get("col_62"),
                "Физическая_активность_за_неделю": patient_data.get("col_63"),
                "С_чем_связано_ограничение_физической_активности": patient_data.get("col_64"),
                "Другое_ограничение_физической_нагрузки": patient_data.get("col_65"),
                "Возраст_наступления_menopause_(лет)": patient_data.get("col_66")
            }
            
            # Использование вспомогательных средств
            assistive_devices = {
                "Использование_вспомогательных_средств": patient_data.get("col_67")
            }
            
            # Падения и переломы, денситометрия
            falls_fractures_densitometry = {
                "Вы_боитесь_упасть": patient_data.get("col_68"),
                "Падения_в_течение_последнего_года": patient_data.get("col_69"),
                "Уточнение_падений_в_течение_последнего_года": patient_data.get("col_70"),
                "Переломы_у_женщин_в_постменопаузальном_периоде_и_у_мужчин_с_50_лет": patient_data.get("col_71"),
                "Уточнение_переломов_у_женщин_в_постменопаузальном_периоде_и_у_мужчин_с_50_лет": patient_data.get("col_72"),
                "Дата_проведения_денситометрии": patient_data.get("col_73"),
                "Бедро_-_Т-критерий_(Total)": patient_data.get("col_74"),
                "Бедро_-_Т-критерий_(Neck)": patient_data.get("col_75"),
                "Бедро_-_МПК_(BCM)__г/см_²_(Total)": patient_data.get("col_76"),
                "Поясничный_отдел_позвоночника_-_Т-критерий_(Total)": patient_data.get("col_77"),
                "Поясничный_отдел_позвоночника_-_Т-критерий_(Худший_результат)": patient_data.get("col_78"),
                "Поясничный_отдел_позвоночника_-_МПК_(BCM)__г/см_²_(Total)": patient_data.get("col_79"),
                "FRAX_-_%_риск_основных_остеопоротических_переломов": patient_data.get("col_80"),
                "FRAX_-_%_риск_переломов_проксимального_отдела_бедра": patient_data.get("col_81"),
                "Заключение": patient_data.get("col_82")
            }
            
            # Осмотр
            examination = {
                "Рост_(см)": patient_data.get("col_83"),
                "Вес_(кг)": patient_data.get("col_84"),
                "ИМТ_(кг/м^2)": patient_data.get("col_85"),
                "Ортостатическая_проба": patient_data.get("col_86"),
                "Систолическое_АД_(сидя)": patient_data.get("col_87"),
                "Диастолическое_АД_(сидя)": patient_data.get("col_88"),
                "ЧСС_(сидя)": patient_data.get("col_89"),
                "Систолическое_АД_(лежа__через_10_минут_после_перехода_в_горизонтальное_положение)": patient_data.get("col_90"),
                "Диастолическое_АД_(лежа__через_10_минут_после_перехода_в_горизонтальное_положение)": patient_data.get("col_91"),
                "ЧСС_(лежа)": patient_data.get("col_92"),
                "Систолическое_АД_(стоя__через_3_минут_после_перехода_в_вертикальное_положение)": patient_data.get("col_93"),
                "Диастолическое_АД_(стоя__через_3_минут_после_перехода_в_вертикальное_положение)": patient_data.get("col_94"),
                "ЧСС_(стоя)": patient_data.get("col_95"),
                "Окружность_по_середине_плеча_(см)": patient_data.get("col_96"),
                "Окружность_голени_(см)": patient_data.get("col_97")
            }
            
            # Результаты лабораторных исследований
            lab_results = {
                "Гемоглобин_(г/л)": patient_data.get("col_98"),
                "Эритроциты_(10*12/л)": patient_data.get("col_99"),
                "Лейкоциты_(10*9/л)": patient_data.get("col_100"),
                "Лимфоциты_abc": patient_data.get("col_101"),
                "Тромбоциты_(10*9/л)": patient_data.get("col_102"),
                "СОЭ_(мм/час)": patient_data.get("col_103"),
                "Общий_белок_(г/л)": patient_data.get("col_104"),
                "Альбумин_(г/л)": patient_data.get("col_105"),
                "Креатинин_(мкмоль/л)": patient_data.get("col_106"),
                "СКФ_(мл/мин/1_73м2)": patient_data.get("col_107"),
                "Гликированный_гемоглобин_(%)": patient_data.get("col_108"),
                "Глюкоза_(ммоль/л)": patient_data.get("col_109"),
                "АСТ_(ЕД/л)": patient_data.get("col_110"),
                "АЛТ_(ЕД/л)": patient_data.get("col_111"),
                "Билирубин_Общий_(мкмоль/л)": patient_data.get("col_112"),
                "Мочевая_кислота_(мкмоль/л)": patient_data.get("col_113"),
                "Холестерин_(ммоль/л)": patient_data.get("col_114"),
                "ЛПНП_(ммоль/л)": patient_data.get("col_115"),
                "ЛПВП_(ммоль/л)": patient_data.get("col_116"),
                "Триглицериды_(ммоль/л)": patient_data.get("col_117"),
                "Са_Ионизир": patient_data.get("col_118"),
                "Са_общий_(ммоль/л)": patient_data.get("col_119"),
                "СРБ_(мг/л)": patient_data.get("col_120"),
                "Сывороточное_железо_(мкмоль/л)": patient_data.get("col_121"),
                "Ферритин_(нг/мл)": patient_data.get("col_122"),
                "Витамин_25_(ОН)_D_(нг/мл)": patient_data.get("col_123"),
                "ТТГ_(мкМЕ/мл)": patient_data.get("col_124"),
                "Витамин_В12_(пг/мл)": patient_data.get("col_125"),
                "Фолиевая_кислота_(нг/мл)": patient_data.get("col_126")
            }
            
            # Результаты инструментальных исследований
            instrumental_results = {
                "Проведение_CAVI": patient_data.get("col_127"),
                "СЛСИ_(справа)": patient_data.get("col_128"),
                "СЛСИ_(слева)": patient_data.get("col_129"),
                "ЛПИ_(справа)": patient_data.get("col_130"),
                "ЛПИ_(слева)": patient_data.get("col_131"),
                "Проведение_ЭХО-КГ": patient_data.get("col_132"),
                "ФВ%": patient_data.get("col_133"),
                "МЖП__мм": patient_data.get("col_134"),
                "КДО__мл": patient_data.get("col_135"),
                "КСО__мл": patient_data.get("col_136"),
                "E/e": patient_data.get("col_137"),
                "Объем_ЛП__мл": patient_data.get("col_138"),
                "СДЛА__мм_рт_ст": patient_data.get("col_139"),
                "Ритм_по_ЭКГ": patient_data.get("col_140"),
                "КТ/МРТ": patient_data.get("col_141"),
                "Fazekas": patient_data.get("col_142"),
                "MTA": patient_data.get("col_143"),
                "Ольфакторный_тест": patient_data.get("col_144"),
                "Была_ли_потеря_обоняния_во_время_НКИ": patient_data.get("col_145")
            }
            
            # Лекарственная терапия
            drug_therapy = {
                "START_—_раздел_и_№": patient_data.get("col_146"),
                "STOPP_—_раздел_и_№": patient_data.get("col_147"),
                "Гиполипидемические_(при_поступлении)": patient_data.get("col_148"),
                "Гиполипидемические_препараты_(при_поступлении)_—_доза": patient_data.get("col_149"),
                "Гипоурикемические_(при_поступлении)": patient_data.get("col_150"),
                "Гипоурикемические_(при_поступлении)_—_доза": patient_data.get("col_151"),
                "И-апф/сартаны_(при_поступлении)": patient_data.get("col_152"),
                "И-апф/сартаны_(при_поступлении)_-_доза": patient_data.get("col_153"),
                "Антагонисты_ангиотензина_II-неприлизина_рецепторов_(при_поступлении)": patient_data.get("col_154"),
                "Антагонисты_ангиотензина_II-неприлизина_рецепторов_(при_поступлении)_—_доза": patient_data.get("col_155"),
                "Блокаторы_кальциевых_каналов_(при_поступлении)": patient_data.get("col_156"),
                "Блокаторы_кальциевых_каналов_(при_поступлении)_—_доза": patient_data.get("col_157"),
                "Бета-адреноблокаторы_(при_поступлении)": patient_data.get("col_158"),
                "Бета-адреноблокаторы_(при_поступлении)_—_доза": patient_data.get("col_159"),
                "Антиаритмики_(при_поступлении)": patient_data.get("col_160"),
                "Антиаритмики_(при_поступлении)_—_доза": patient_data.get("col_161"),
                "Диуретики_(при_поступлении)": patient_data.get("col_162"),
                "Диуретики_(при_поступлении)_—_доза": patient_data.get("col_163"),
                "ИНГЛТ2_(при_поступлении)": patient_data.get("col_164"),
                "ИНГЛТ2_(при_поступлении)_—_доза": patient_data.get("col_165"),
                "Инсулин_(при_поступлении)": patient_data.get("col_166"),
                "Инсулин_(при_поступлении)_—_доза": patient_data.get("col_167"),
                "Препараты_сульфонилмочевины_(при_поступлении)": patient_data.get("col_168"),
                "Препараты_сульфонилмочевины_(при_поступлении)_—_доза": patient_data.get("col_169"),
                "И-ДПП4_(при_поступлении)": patient_data.get("col_170"),
                "И-ДПП4_(при_поступлении)_—_доза": patient_data.get("col_171"),
                "Бигуаниды_(при_поступлении)": patient_data.get("col_172"),
                "Бигуаниды_(при_поступлении)_—_доза": patient_data.get("col_173"),
                "Мемантин_(при_поступлении)": patient_data.get("col_174"),
                "Мемантин_(при_поступлении)_—_доза": patient_data.get("col_175"),
                "Ингибиторы_ацетилхолинэстеразы_(при_поступлении)": patient_data.get("col_176"),
                "Ингибиторы_ацетилхолинэстеразы_(при_поступлении)_—_доза": patient_data.get("col_177"),
                "Антикоагулянты_(при_поступлении)": patient_data.get("col_178"),
                "Антикоагулянты_(при_поступлении)_—_Доза": patient_data.get("col_179"),
                "Препараты_витамина_D_(при_поступлении)": patient_data.get("col_180"),
                "Препараты_витамина_D_(при_поступлении)_—_Доза": patient_data.get("col_181"),
                "Препараты_(при_поступлении)_-_без_указания_дозы": patient_data.get("col_182"),
                "Гиполипидемические_препараты_(Рекомендации_из_выписного_эпикриза)": patient_data.get("col_183"),
                "Гиполипидемические_препараты_(Рекомендации_из_выписного_эпикриза)_—_доза": patient_data.get("col_184"),
                "Гипоурикемические_(Рекомендации_из_выписного_эпикриза)": patient_data.get("col_185"),
                "Гипоурикемические_(Рекомендации_из_выписного_эпикриза)_—_доза": patient_data.get("col_186"),
                "И-апф/сартаны_(Рекомендации_из_выписного_эпикриза)": patient_data.get("col_187"),
                "И-апф/сартаны_(Рекомендации_из_выписного_эпикриза)_-_доза": patient_data.get("col_188"),
                "Антагонисты_ангиотензина_II-неприлизина_рецепторов_(Рекомендации_из_выписного_эпикриза)": patient_data.get("col_189"),
                "Антаゴнисты_ангиотензина_II-неприлизина_рецепторов_(Рекомендации_из_выписного_эпикриза)_—_доза": patient_data.get("col_190"),
                "Блокаторы_кальциевых_каналов_(Рекомендации_из_выписного_эпикриза)": patient_data.get("col_191"),
                "Блокаторы_кальциевых_каналов_(Рекомендации_из_выписного_эпикриза)_—_доза": patient_data.get("col_192"),
                "Бета-адреноблокаторы_(Рекомендации_из_выписного_эпикриза)": patient_data.get("col_193"),
                "Бета-адреноблокаторы_(Рекомендации_из_выписного_эпикриза)_—_доза": patient_data.get("col_194"),
                "Антиаритмики_(Рекомендации_из_выписного_эпикриза)": patient_data.get("col_195"),
                "Антиаритмики_(Рекомендации_из_выписного_эпикиза)_—_доза": patient_data.get("col_196"),
                "Диуретики_(Рекомендации_из_выписного_эпикриза)": patient_data.get("col_197"),
                "Диуретики_(Рекомендации_из_выписного_эпикриза)_—_доза": patient_data.get("col_198"),
                "ИНГЛТ2_(Рекомендации_из_выписного_эпикриза)": patient_data.get("col_199"),
                "ИНГЛТ2_(Рекомендации_из_выписного_эпикриза)_—_доза": patient_data.get("col_200"),
                "Инсулин_(Рекомендации_из_выписного_эпикриза)": patient_data.get("col_201"),
                "Инсулин_(Рекомендации_из_выписного_эпикриза)_—_доза": patient_data.get("col_202"),
                "Препараты_сульфонилмочевины_(Рекомендации_из_выписного_эпикриза)": patient_data.get("col_203"),
                "Препараты_сульфонилмочевины_(Рекомендации_из_выписного_эпикриза)_—_доза": patient_data.get("col_204"),
                "И-ДПП4_(Рекомендации_из_выписного_эпикриза)": patient_data.get("col_205"),
                "И-ДПП4_(Рекомендации_из_выписного_эпикриза)_—_доза": patient_data.get("col_206"),
                "Бигуаниды_(Рекомендации_из_выписного_эпикиза)": patient_data.get("col_207"),
                "Бигуаниды_(Рекомендации_из_выписного_эпикриза)_—_доза": patient_data.get("col_208"),
                "Мемантин_(Рекомендации_из_выписного_эпикриза)": patient_data.get("col_209"),
                "Мемантин_(Рекомендации_из_выписного_эпикриза)_—_доза": patient_data.get("col_210"),
                "Ингибиторы_ацетилхолинэстеразы_(Рекомендации_из_выписного_эпикриза)": patient_data.get("col_211"),
                "Ингибиторы_ацетилхолинэстеразы_(Рекомендации_из_выписного_эпикриза)_—_доза": patient_data.get("col_212"),
                "Антикоагулянты_(Рекомендации_из_выписного_эпикриза)": patient_data.get("col_213"),
                "Антикоагулянты_(Рекомендации_из_выписного_эпикриза)_—_Доза": patient_data.get("col_214"),
                "Препараты_витамина_D_(Рекомендации_из_выписного_эпикриза)": patient_data.get("col_215"),
                "Препараты_витамина_D_(Рекомендации_из_выписного_эпикриза)_—_Доза": patient_data.get("col_216"),
                "Препараты_(Рекомендации_из_выписного_эпикриза)_-_без_указания_дозы": patient_data.get("col_217"),
                "Лекарственная_терапия_при_поступлении": patient_data.get("col_218"),
                "Лекарственная_терапия_при_выписке": patient_data.get("col_219")
            }
            
            # Клиническая шкала старческой астении
            clinical_frailty_scale = {
                "Клиническая_шкала_старческой_астении": patient_data.get("col_220"),
                "Шкала_старческой_астении_количество_баллов": patient_data.get("col_221")
            }
            
            # Шкала Бартел (ADL)
            barthel_scale = {
                "Прием_пищи": patient_data.get("col_222"),
                "Личная_гигиена": patient_data.get("col_223"),
                "Одевание": patient_data.get("col_224"),
                "Прием_ванны": patient_data.get("col_225"),
                "Посещение_туалета": patient_data.get("col_226"),
                "Контролирование_мочеиспускания": patient_data.get("col_227"),
                "Контролирование_дефекации": patient_data.get("col_228"),
                "Перемещение_с_кровати_на_стул_и_обратно": patient_data.get("col_229"),
                "Подъем_по_лестнице": patient_data.get("col_230"),
                "Мобильность": patient_data.get("col_231"),
                "индекс_Бартел_количество_баллов": patient_data.get("col_232")
            }
            
            # Шкала Лоутон (IADL)
            lawton_scale = {
                "Телефонные_звонки": patient_data.get("col_233"),
                "Покупки": patient_data.get("col_234"),
                "Приготовление_пищи": patient_data.get("col_235"),
                "Ведение_домашнего_быта": patient_data.get("col_236"),
                "Стирка": patient_data.get("col_237"),
                "Пользование_транспортом": patient_data.get("col_238"),
                "Прием_лекарств": patient_data.get("col_239"),
                "Финансовые_операции": patient_data.get("col_240"),
                "Лоутон_количество_баллов": patient_data.get("col_241")
            }
            
            # Краткая батарея тестов физического функционирования (SPPB)
            sppb_scale = {
                "Положение_«стопы_вместе»": patient_data.get("col_242"),
                "Полутандемное_положение": patient_data.get("col_243"),
                "Тандемное_положение": patient_data.get("col_244"),
                "Ходьба_на_4_м": patient_data.get("col_245"),
                "Ходьба_на_4_метра_(секунды)": patient_data.get("col_246"),
                "Подъём_со_стула": patient_data.get("col_247"),
                "Подъём_со_стула_(секунды)": patient_data.get("col_248"),
                "SPPB_количество_баллов": patient_data.get("col_249")
            }
            
            # Тест "Встань и иди"
            get_up_and_go_test = {
                "Скорость_ходьбы_на_дистанции_4_м_(секунды)": patient_data.get("col_250"),
                "Скорость_ходьбы_на_дистанции_4_м_(м/сек)": patient_data.get("col_251"),
                "Тест_«встань_и_иди»_(сек)": patient_data.get("col_252")
            }
            
            # Двухминутный тест с ходьбой
            two_minute_walk_test = {
                "Результат_(количество_шагов)": patient_data.get("col_253")
            }
            
            # Стратификация по уровню физической активности
            physical_activity_level = {
                "Уровень": patient_data.get("col_254"),
                "Сумма_баллов_за_выполненные_физические_упражнения": patient_data.get("col_255")
            }
            
            # Динамометрия
            dynamometry = {
                "Правая_рука__кг_(1_попытка)": patient_data.get("col_256"),
                "Правая_рука__кг_(2_попытка)": patient_data.get("col_257"),
                "Левая_рука__кг_(1_попытка)": patient_data.get("col_258"),
                "Левая_рука__кг_(2_попытка)": patient_data.get("col_259"),
                "Интерпретация_динамометрии": patient_data.get("col_260")
            }
            
            # Краткая шкала оценки питания (MNA)
            mna_scale = {
                "Снизилось_ли_за_последние_3мес_кол-во_пищи__которое_вы_съедаете__из-за_потери_аппетита__проблем_с_пищеварением__из-за_сложностей_при_пережевывании_и_глотании": patient_data.get("col_261"),
                "Потеря_массы_тела_за_последние_3_месяца": patient_data.get("col_262"),
                "Подвижность": patient_data.get("col_263"),
                "Острое_заболевание_(стресс)_за_последние_3_месяца": patient_data.get("col_264"),
                "Психоневрологические_проблемы": patient_data.get("col_265"),
                "Индекс_масса_тела": patient_data.get("col_266"),
                "Живет_независимо_(не_в_доме_престарелых_или_больнице)": patient_data.get("col_267"),
                "Принимает_более_трех_лекарств_в_день": patient_data.get("col_268"),
                "Пролежни_и_язвы_кожа": patient_data.get("col_269"),
                "Сколько_раз_в_день_пациент_полноценно_питается": patient_data.get("col_270"),
                "Маркеры_потребления_белковой_пищи": patient_data.get("col_271"),
                "Съедает_2_или_более_порций_фруктов_или_овощей_в_день": patient_data.get("col_272"),
                "Сколько_жидкости_выпивает_в_день": patient_data.get("col_273"),
                "Способ_питания": patient_data.get("col_274"),
                "Самооценка_состояния_питания": patient_data.get("col_275"),
                "Состояние_здоровья_в_сравнении_с_другими_людьми_своего_возраста": patient_data.get("col_276"),
                "Окружность_по_середине_плеча__см": patient_data.get("col_277"),
                "Окружность_голени__см": patient_data.get("col_278"),
                "MNA_количество_баллов": patient_data.get("col_279")
            }
            
            # Краткая шкала оценки психического статуса (MMSE)
            mmse_scale = {
                "Назовите_дату": patient_data.get("col_280"),
                "Где_мы_находимся": patient_data.get("col_281"),
                "Повторите_три_слова": patient_data.get("col_282"),
                "Серийный_счет": patient_data.get("col_283"),
                "Припомните_3_слова": patient_data.get("col_284"),
                "Показать_ручку_и_часы": patient_data.get("col_285"),
                "Просим_повторить_предложение": patient_data.get("col_286"),
                "Выполнение_3-этапной_команды": patient_data.get("col_287"),
                "Чтение": patient_data.get("col_288"),
                "Срисуйте_рисунок": patient_data.get("col_289"),
                "MMSE_количество_баллов": patient_data.get("col_290")
            }
            
            # Шкала MOCA
            moca_scale = {
                "Создание_альтернирующего_пути": patient_data.get("col_291"),
                "Зрительно-конструктивные_навыки": patient_data.get("col_292"),
                "Часы": patient_data.get("col_293"),
                "Называние_животных": patient_data.get("col_294"),
                "Прямой_и_обратный_цифровые_ряды": patient_data.get("col_295"),
                "Ряд_букв_(«А»)": patient_data.get("col_296"),
                "Серийное_вычитание": patient_data.get("col_297"),
                "Повторение_фразы": patient_data.get("col_298"),
                "Беглость_речи_(слова_на_букву)": patient_data.get("col_299"),
                "Абстракция": patient_data.get("col_300"),
                "Отсроченное_воспроизведение": patient_data.get("col_301"),
                "Ориентация": patient_data.get("col_302"),
                "Добавление_балла_за_образование_12_и_менее_лет": patient_data.get("col_303"),
                "MOCA_количество_баллов": patient_data.get("col_304")
            }
            
            # Оценка качества жизни (EQ-5D)
            eq5d_scale = {
                "ПОДВИЖНОСТЬ": patient_data.get("col_305"),
                "УХОД_ЗА_СОБОЙ": patient_data.get("col_306"),
                "ПОВСЕДНЕВНАя_ДЕЯТЕЛЬНОСТЬ": patient_data.get("col_307"),
                "БОЛЬ/ДИСКОМФОРТ": patient_data.get("col_308"),
                "ТРЕВОГА/ДЕПРЕССИЯ": patient_data.get("col_309"),
                "EQ-5D_количество_баллов": patient_data.get("col_310")
            }
            
            # Состояние на сегодняшний день
            today_status = {
                "Оцените_состояние_вашего_здоровья_на_сегодня_от_0_до_100": patient_data.get("col_311")
            }
            
            # Оценка гериатрического индекса здоровья
            geriatric_health_index = {
                "Шкала_Бартел__общий_балл": patient_data.get("col_312"),
                "Шкала_Лоутон__общий_балл": patient_data.get("col_313"),
                "Краткая_шкала_оценки_психического_статуса_(MMSE)__общий_балл": patient_data.get("col_314"),
                "Индекс_коморбидности_Чарлсона__общий_балл": patient_data.get("col_315"),
                "Краткая_шкала_оценки_питания_(MNA)__общий_балл": patient_data.get("col_316"),
                "Количество_лекарственных_препаратов": patient_data.get("col_317"),
                "Социальный_статус": patient_data.get("col_318"),
                "Оценка_здоровья_количество_баллов": patient_data.get("col_319")
            }

            # Дополнительные медицинские условия (бинарные признаки)
            medical_conditions = {
                "ХБП": patient_data.get("col_320"),
                "Нарушение мочеиспускания": patient_data.get("col_321"),
                "Нарушение походки": patient_data.get("col_322"),
                "Нарушение зрения": patient_data.get("col_323"),
                "Заболевания ЩЖ": patient_data.get("col_324"),
                "ГЭРБ": patient_data.get("col_325"),
                "Болезнь Паркинсона": patient_data.get("col_326"),
                "Ожирение": patient_data.get("col_327"),
                "Дислипидемия": patient_data.get("col_328"),
                "Варикозная болезнь вен нижних конечностей": patient_data.get("col_329"),
                "Артериальная гипертензия": patient_data.get("col_330"),
                "Гиперурикемия": patient_data.get("col_331"),
                "ИБС": patient_data.get("col_332"),
                "Остеоартроз": patient_data.get("col_333"),
                "НАЖБП": patient_data.get("col_334"),
                "Хронический гастрит": patient_data.get("col_335"),
                "Анемия": patient_data.get("col_336"),
                "Полинейропатия": patient_data.get("col_337"),
                "Нарушение слуха": patient_data.get("col_338"),
                "ЖКБ": patient_data.get("col_339"),
                "Цереброваскулярная болезнь": patient_data.get("col_340"),
                "ОНМК в анамнезе": patient_data.get("col_341"),
                "ДГПЖ": patient_data.get("col_342"),
                "Нарушение гликемии натощак/НТГ": patient_data.get("col_343"),
                "Гемодинамически значимый атеросклероз некоронарных артерий (БЦА": patient_data.get("col_344"),
                "н/к/почечные) (>50%)": patient_data.get("col_345"),
                "Инфаркт миокарда в анамнезе": patient_data.get("col_346"),
                "ХСН": patient_data.get("col_347"),
                "Фибрилляция/трепетание предсердий": patient_data.get("col_348"),
                "Нарушение дефекации": patient_data.get("col_349"),
                "Язвенная болезнь": patient_data.get("col_350"),
                "Сахарный диабет": patient_data.get("col_351"),
                "ХОБЛ": patient_data.get("col_352"),
                "Бронхиальная астма": patient_data.get("col_353"),
                "Дегенеративно-дистрофическая болезнь позвоночника (Дорсопатия)": patient_data.get("col_354"),
                "Мочекаменная болезь": patient_data.get("col_355"),
                "Стентирование/АКШ в анамнезе": patient_data.get("col_356"),
                "ЭКС": patient_data.get("col_357"),
                "Онкологические заболевания в стадии ремиссии": patient_data.get("col_358"),
                "Головокружение": patient_data.get("col_359"),
                "Контрактура Дюпюитрена": patient_data.get("col_360"),
                "Ревматоидный артрит": patient_data.get("col_361"),
                "Подагрический артрит": patient_data.get("col_362"),
                "Вальгусная деформация": patient_data.get("col_363"),
                "Гипо/гиперпаратиреоз": patient_data.get("col_364"),
                "Адентия": patient_data.get("col_365"),
                "Дисфагия": patient_data.get("col_366"),
                "СРК": patient_data.get("col_367"),
                "Изменение тембра голоса": patient_data.get("col_368"),
                "Трофические язвы/пролежни": patient_data.get("col_369")
            }
            
            # Формируем итоговый ответ
            response = {
                "general_info": general_info,
                "age_not_obstacle": age_not_obstacle,
                "social_history": social_history,
                "epidemiological_history": epidemiological_history,
                "chronic_diseases": chronic_diseases,
                "chronic_pain": chronic_pain,
                "hospitalization": hospitalization,
                "risk_factors": risk_factors,
                "assistive_devices": assistive_devices,
                "falls_fractures_densitometry": falls_fractures_densitometry,
                "examination": examination,
                "lab_results": lab_results,
                "instrumental_results": instrumental_results,
                "drug_therapy": drug_therapy,
                "clinical_frailty_scale": clinical_frailty_scale,
                "barthel_scale": barthel_scale,
                "lawton_scale": lawton_scale,
                "sppb_scale": sppb_scale,
                "get_up_and_go_test": get_up_and_go_test,
                "two_minute_walk_test": two_minute_walk_test,
                "physical_activity_level": physical_activity_level,
                "dynamometry": dynamometry,
                "mna_scale": mna_scale,
                "mmse_scale": mmse_scale,
                "moca_scale": moca_scale,
                "eq5d_scale": eq5d_scale,
                "today_status": today_status,
                "geriatric_health_index": geriatric_health_index,
                "medical_conditions": medical_conditions,
                "scale_interpretations": scale_interpretations  # Добавляем обобщенную оценку по шкалам
            }
            
            return response
            
    except SQLAlchemyError as e:
        logger.error(f"Database error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")