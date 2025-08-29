// frontend/src/components/LevelFA.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './LevelFA.module.css';
import { useNavigate } from 'react-router-dom';

function LevelFA() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [patientInfo, setPatientInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictMessage, setPredictMessage] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    autoAssessment: false,
    manualAssessment: false,
  });

  // Состояние для калькулятора
  const [calculatorParams, setCalculatorParams] = useState({
    col_14: '',
    col_58: '',
    col_59: '',
    col_85: '',
    col_232: '',
    col_249: '',
    col_252: '',
    col_245: '',
  });
  
  const [calculatorResult, setCalculatorResult] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showSaveButton, setShowSaveButton] = useState(false);

  const [formData, setFormData] = useState({
    anaerobic_squat: '',
    anaerobic_expander: '',
    anaerobic_pushup: '',
    anaerobic_leg: '',
    anaerobic_sideleg: '',
    standing_toes: '',
    standing_sideleg: '',
    standing_chair: '',
    standing_squat: '',
    cardio_walking: '',
    balance_line_walking: '',
    balance_knee_bend: '',
    balance_toes_heels: '',
    balance_toes_heels_walking: '',
    balance_eight_walking: '',
    stretch_arms: '',
    stretch_shoulders: '',
    stretch_thighs: '',
    stretch_neck: '',
    stretch_ankle: '',
    stretch_shoulder_upper_back: '',
    stretch_hamstring: '',
    anaerobic_level: 0,
    cardio_level: 0,
    balance_level: 0,
    stretching_level: 0,
    overall_level: 0,
  });

  const navigate = useNavigate();
  const manualInputRef = useRef(null);
  const [manualInputHeight, setManualInputHeight] = useState(0);

  // Опции для выбора физической активности - кратность
  const frequencyOptions = [
    '<1 раза в месяц',
    '<1 раза в неделю',
    '1 раз в неделю',
    '2-3 раза в неделю',
    'Ежедневно'
  ];

  // Опции для выбора физической активности - продолжительность
  const durationOptions = [
    '<30 мин',
    '30-60 мин',
    '1-4 часа',
    '>4 часов'
  ];

  // Опции для ходьбы на 4 м
  const walkingOptions = [
    'Не может выполнить',
    '≥8,71 с',
    '6,21–8,70 с',
    '4,82–6,20 с',
    '≤4,81 с'
  ];

  const handleCalculatorParamChange = (field, value) => {
    setCalculatorParams((prev) => ({ ...prev, [field]: value }));
  };

  const validateCalculatorParams = () => {
    const requiredFields = ['col_14', 'col_58', 'col_59', 'col_85', 'col_232', 'col_249', 'col_252', 'col_245'];
    for (const field of requiredFields) {
      if (calculatorParams[field] === '') {
        return `Пожалуйста, заполните поле ${getFieldLabel(field)}`;
      }
    }

    // Дополнительные валидации
    const col_14 = parseFloat(calculatorParams.col_14);
    if (isNaN(col_14) || col_14 < 0 || col_14 > 7) {
      return "Бал 'Возраст не помеха' должен быть от 0 до 7";
    }

    const col_85 = parseFloat(calculatorParams.col_85);
    if (isNaN(col_85) || col_85 < 10 || col_85 > 50) {
      return "ИМТ должен быть от 10 до 50";
    }

    const col_232 = parseFloat(calculatorParams.col_232);
    if (isNaN(col_232) || col_232 < 0 || col_232 > 100 || col_232 % 5 !== 0) {
      return "Индекс Бартел должен быть от 0 до 100 и кратен 5";
    }

    const col_249 = parseInt(calculatorParams.col_249);
    if (isNaN(col_249) || col_249 < 0 || col_249 > 12) {
      return "SPPB должен быть от 0 до 12";
    }

    const col_252 = parseFloat(calculatorParams.col_252);
    if (isNaN(col_252) || col_252 < 0) {
      return "Время теста 'Встань и иди' не может быть отрицательным";
    }

    return null;
  };

  // Функции для преобразования col_245
  const transformCol245NumberToText = (value) => {
    if (value === null || value === undefined || value === '') return '';
    
    const numValue = parseInt(value);
    const mapping = {
      0: "Не может выполнить",
      1: "≥8,71 с",
      2: "6,21–8,70 с", 
      3: "4,82–6,20 с",
      4: "≤4,81 с"
    };
    return mapping[numValue] || '';
  };
  
  const transformCol245TextToNumber = (value) => {
    const mapping = {
      "Не может выполнить": 0,
      "≥8,71 с": 1,
      "6,21–8,70 с": 2,
      "4,82–6,20 с": 3,
      "≤4,81 с": 4
    };
    return mapping[value] || 0;
  };

  // Функции для преобразования col_245
  const transformCol245ForDisplay = (value) => {
    if (value === null || value === undefined) return '';
    
    const mapping = {
      0: "Не может выполнить",
      1: "≥8,71 с",
      2: "6,21–8,70 с", 
      3: "4,82–6,20 с",
      4: "≤4,81 с"
    };
    return mapping[value] || '';
  };

  const transformCol245ForModel = (value) => {
    const mapping = {
      "Не может выполнить": 0,
      "≥8,71 с": 1,
      "6,21–8,70 с": 2,
      "4,82–6,20 с": 3,
      "≤4,81 с": 4
    };
    return mapping[value] || 0;
  };

  const handleCalculateActivity = async () => {
    setIsCalculating(true);
    setCalculatorResult(null);
    setError(null);
    setShowSaveButton(false);
  
    try {
      const validationError = validateCalculatorParams();
      if (validationError) {
        throw new Error(validationError);
      }
  
      // Преобразуем текстовое значение col_245 обратно в число для модели
      const col245Number = transformCol245TextToNumber(calculatorParams.col_245);
  
      // Преобразуем данные в числовой формат
      const values = [
        parseFloat(calculatorParams.col_14),
        transformCol58(calculatorParams.col_58),
        transformCol59(calculatorParams.col_59),
        parseFloat(calculatorParams.col_85),
        parseFloat(calculatorParams.col_232),
        parseInt(calculatorParams.col_249),
        parseFloat(calculatorParams.col_252),
        col245Number // Используем числовое значение для модели
      ];
  
      const response = await fetch('http://127.0.0.1:8000/level-fa/predict-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Ошибка сервера: ${response.status}`);
      }
  
      const result = await response.json();
      const activityStr = levelMap.get(result.predicted_class, `Класс ${result.predicted_class}`);
      setCalculatorResult(activityStr);
      setShowSaveButton(!!selectedPatient);
    } catch (e) {
      console.error("Ошибка при расчёте:", e);
      setError(`Ошибка: ${e.message || "Не удалось выполнить расчёт."}`);
    } finally {
      setIsCalculating(false);
    }
  };

  const clearCalculator = () => {
    setCalculatorParams({
      col_14: '',
      col_58: '',
      col_59: '',
      col_85: '',
      col_232: '',
      col_249: '',
      col_252: '',
      col_245: '',
    });
    setCalculatorResult(null);
    setError(null);
  };

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://127.0.0.1:8000/level-fa/patients');
      if (!response.ok) {
        throw new Error(`Ошибка HTTP: ${response.status}`);
      }
      const data = await response.json();
      setPatients(data);
    } catch (e) {
      console.error("Ошибка при загрузке пациентов:", e);
      setError("Не удалось загрузить данные пациентов. Проверьте соединение с сервером.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  useEffect(() => {
    if (expandedSections.manualInput && manualInputRef.current) {
      setManualInputHeight(manualInputRef.current.scrollHeight);
    } else {
      setManualInputHeight(0);
    }
  }, [expandedSections.manualInput]);

  const handlePatientSelect = async (e) => {
    const patientCode = e.target.value;
    setSelectedPatient(patientCode);
    setError(null);
    
    if (patientCode) {
      setLoading(true);
      try {
        const response = await fetch(`http://127.0.0.1:8000/level-fa/patients/${patientCode}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || `Ошибка HTTP: ${response.status}`);
        }
        const data = await response.json();
        
        // Преобразуем числовое значение col_245 в текстовое для отображения
        const col245Text = transformCol245NumberToText(data.col_245);
        
        // Заполняем калькулятор данными пациента
        setCalculatorParams({
          col_14: data.col_14 || '',
          col_58: data.col_58 || '',
          col_59: data.col_59 || '',
          col_85: data.col_85 || '',
          col_232: data.col_232 || '',
          col_249: data.col_249 || '',
          col_252: data.col_252 || '',
          col_245: col245Text, // Используем преобразованное текстовое значение
        });
        
        // Показываем сообщение о выбранном пациенте
        setPatientInfo(`Выбран пациент с кодом ${patientCode}`);
      } catch (e) {
        console.error("Ошибка при загрузке данных пациента:", e);
        setError(`Не удалось загрузить данные пациента: ${e.message}`);
      } finally {
        setLoading(false);
      }
    } else {
      // Очищаем калькулятор если пациент не выбран
      setCalculatorParams({
        col_14: '',
        col_58: '',
        col_59: '',
        col_85: '',
        col_232: '',
        col_249: '',
        col_252: '',
        col_245: '',
      });
      setPatientInfo(null);
    }
  };

  const getFieldLabel = (field) => {
    const labels = {
      col_14: "Бал 'Возраст не помеха'",
      col_58: 'Физическая активность - кратность',
      col_59: 'Физическая активность - продолжительность',
      col_85: 'ИМТ',
      col_232: 'Индекс Бартел',
      col_249: 'SPPB',
      col_252: "Тест 'Встань и иди'",
      col_245: 'Ходьба на 4 м'
    };
    return labels[field] || field;
  };

  const handlePredictActivity = async () => {
    if (!selectedPatient) {
      setError("Пожалуйста, выберите пациента.");
      return;
    }

    setIsPredicting(true);
    setPredictMessage(null);
    setError(null);

    try {
      const response = await fetch('http://127.0.0.1:8000/level-fa/predict-activity-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: parseInt(selectedPatient) }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Ошибка сервера: ${response.status}`);
      }

      const result = await response.json();
      setPredictMessage(result.activity_level);
    } catch (e) {
      console.error("Ошибка при оценке:", e);
      setError(`Ошибка: ${e.message || "Не удалось выполнить оценку."}`);
    } finally {
      setIsPredicting(false);
    }
  };

  const handleSavePredictResult = async () => {
    if (!selectedPatient || !predictMessage) return;
    
    try {
      const faLevel = parseInt(predictMessage.match(/\((\d)\s*ур\.\)/)?.[1] || predictMessage.match(/Класс (\d)/)?.[1]);
      
      const response = await fetch('http://127.0.0.1:8000/level-fa/save-fa-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: parseInt(selectedPatient),
          fa_level: faLevel
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Ошибка сервера: ${response.status}`);
      }

      setError("Результат успешно сохранён");
    } catch (e) {
      console.error("Ошибка при сохранении:", e);
      setError(`Ошибка: ${e.message || "Не удалось сохранить результат."}`);
    }
  };

  const handleSaveResult = async () => {
    if (!selectedPatient || !calculatorResult) return;
    
    try {
      const faLevel = parseInt(calculatorResult.match(/\((\d)\s*ур\.\)/)?.[1] || calculatorResult.match(/Класс (\d)/)?.[1]);
      
      const response = await fetch('http://127.0.0.1:8000/level-fa/save-fa-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: parseInt(selectedPatient),
          fa_level: faLevel
        }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Ошибка сервера: ${response.status}`);
      }
  
      setError("Результат успешно сохранён");
      setShowSaveButton(false);
    } catch (e) {
      console.error("Ошибка при сохранении:", e);
      setError(`Ошибка: ${e.message || "Не удалось сохранить результат."}`);
    }
  };

  const handleSaveLFKResult = async () => {
    if (!selectedPatient || !formData.overall_level) {
      setError("Пожалуйста, выберите пациента и определите уровень ЛФК.");
      return;
    }
    
    try {
      const response = await fetch('http://127.0.0.1:8000/level-fa/save-lfk-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: parseInt(selectedPatient),
          lfk_level: formData.overall_level
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Ошибка сервера: ${response.status}`);
      }

      setError("Результат ЛФК успешно сохранён");
    } catch (e) {
      console.error("Ошибка при сохранении:", e);
      setError(`Ошибка: ${e.message || "Не удалось сохранить результат ЛФК."}`);
    }
  };

  // Вспомогательные функции для преобразования значений
  const transformCol58 = (value) => {
    const mapping = {
      '<1 раза в месяц': 0.0,
      '<1 раза в неделю': 1.0,
      '1 раз в неделю': 2.0,
      '2-3 раза в неделю': 3.0,
      'Ежедневно': 4.0
    };
    return mapping[value] || 0.0;
  };

  const transformCol59 = (value) => {
    const mapping = {
      '<30 мин': 0.0,
      '30-60 мин': 1.0,
      '1-4 часа': 2.0,
      '>4 часов': 3.0
    };
    return mapping[value] || 0.0;
  };

  const levelMap = new Map([
    [1, "Низкий(1 ур.)"],
    [2, "Ниже среднего(2 ур.)"],
    [3, "Средний(3 ур.)"],
    [4, "Выше среднего(4 ур.)"],
    [5, "Высокий(5 ур.)"]
  ]);

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => {
      const newFormData = { ...prev, [field]: value };
      const calculateLevel = (fields, options) => {
        const selectedIndices = fields
          .map((f) => options.indexOf(newFormData[f]) + 1)
          .filter((index) => index > 0);
        return selectedIndices.length > 0
          ? Math.round(selectedIndices.reduce((sum, curr) => sum + curr, 0) / selectedIndices.length)
          : 0;
      };

      const anaerobicFields = [
        'anaerobic_squat',
        'anaerobic_expander',
        'anaerobic_pushup',
        'anaerobic_leg',
        'anaerobic_sideleg',
        'standing_toes',
        'standing_sideleg',
        'standing_chair',
        'standing_squat',
      ];
      const cardioFields = ['cardio_walking'];
      const balanceFields = [
        'balance_line_walking',
        'balance_knee_bend',
        'balance_toes_heels',
        'balance_toes_heels_walking',
        'balance_eight_walking',
      ];
      const stretchingFields = [
        'stretch_arms',
        'stretch_shoulders',
        'stretch_thighs',
        'stretch_neck',
        'stretch_ankle',
        'stretch_shoulder_upper_back',
        'stretch_hamstring',
      ];

      const anaerobicOptions = ['1x10', '2x10', '2x12', '3x10', '3x12'];
      const cardioOptions = [
        '2 подхода по 2–5 минут',
        '3 подхода по 8 минут',
        '3 подхода по 10 минут',
        '3 подхода по 15 минут',
        '2 подхода по 20 минут',
      ];
      const balanceOptions = [
        '3 подхода по 10 шагов',
        '3 подхода по 15 шагов',
        '3 подхода по 20 шагов',
        '3 подхода по 25 шагов',
        '3 подхода по 30 шагов',
      ];
      const stretchingOptions = ['3x2', '3x3'];

      const anaerobicLevel = calculateLevel(anaerobicFields, anaerobicOptions);
      const cardioLevel = calculateLevel(cardioFields, cardioOptions);
      const balanceLevel = calculateLevel(
        balanceFields,
        balanceFields.includes('balance_eight_walking') && newFormData['balance_eight_walking']
          ? [...balanceOptions, '3 подхода по 2 круга']
          : balanceOptions
      );
      const stretchingLevel = calculateLevel(stretchingFields, stretchingOptions);

      const levels = [anaerobicLevel, cardioLevel, balanceLevel, stretchingLevel].filter((level) => level > 0);
      const overallLevel = levels.length > 0 ? Math.round(levels.reduce((sum, curr) => sum + curr, 0) / levels.length) : 0;

      return {
        ...newFormData,
        anaerobic_level: anaerobicLevel,
        cardio_level: cardioLevel,
        balance_level: balanceLevel,
        stretching_level: stretchingLevel,
        overall_level: overallLevel,
      };
    });
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 1: return '#ef4444';
      case 2: return '#f97316';
      case 3: return '#eab308';
      case 4: return '#3b82f6';
      case 5: return '#22c55e';
      default: return '#374151';
    }
  };

  return (
    <div className="container">
      <h2 className="title">Оценка уровня физической активности</h2>

      {/* Калькулятор всегда виден */}
      <section className="section">
        <h3 className={styles.sectionTitle}>Калькулятор расчёта уровня ФА</h3>
        {patientInfo && (
          <div className={styles.patientInfo}>
            <p>{patientInfo}</p>
          </div>
        )}
        <div className={styles.sectionContent}>
          <div className={styles.calculatorContainer}>
            <div className={styles.calculatorHeader}>
              <h3 className={styles.calculatorTitle}>Автоматический расчёт уровня физической активности</h3>
              <p className={styles.calculatorDescription}>
                Введите параметры пациента для автоматического определения уровня физической активности
              </p>
            </div>

            <div className={styles.calculatorForm}>
              <div className={styles.calculatorGrid}>
                <div className={styles.calculatorField}>
                  <label className={styles.calculatorLabel}>
                    <span className={styles.calculatorLabelText}>Бал "Возраст не помеха (0-7 баллов)"</span>
                    <input
                      type="number"
                      className={styles.calculatorInput}
                      value={calculatorParams.col_14}
                      onChange={(e) => handleCalculatorParamChange('col_14', e.target.value)}
                      disabled={isCalculating}
                      min="0"
                      max="7"
                      step="0.1"
                      placeholder="---"
                    />
                  </label>
                </div>

                <div className={styles.calculatorField}>
                  <label className={styles.calculatorLabel}>
                    <span className={styles.calculatorLabelText}>Физическая активность - кратность</span>
                    <select
                      className={styles.calculatorSelect}
                      value={calculatorParams.col_58}
                      onChange={(e) => handleCalculatorParamChange('col_58', e.target.value)}
                      disabled={isCalculating}
                    >
                      <option value="">Выберите кратность</option>
                      <option value="<1 раза в месяц">&lt;1 раза в месяц</option>
                      <option value="<1 раза в неделю">&lt;1 раза в неделю</option>
                      <option value="1 раз в неделю">1 раз в неделю</option>
                      <option value="2-3 раза в неделю">2-3 раза в неделю</option>
                      <option value="Ежедневно">Ежедневно</option>
                    </select>
                  </label>
                </div>

                <div className={styles.calculatorField}>
                  <label className={styles.calculatorLabel}>
                    <span className={styles.calculatorLabelText}>Физическая активность - продолжительность</span>
                    <select
                      className={styles.calculatorSelect}
                      value={calculatorParams.col_59}
                      onChange={(e) => handleCalculatorParamChange('col_59', e.target.value)}
                      disabled={isCalculating}
                    >
                      <option value="">Выберите продолжительность</option>
                      <option value="<30 мин">&lt;30 мин</option>
                      <option value="30-60 мин">30-60 мин</option>
                      <option value="1-4 часа">1-4 часа</option>
                      <option value=">4 часов">&gt;4 часов</option>
                    </select>
                  </label>
                </div>

                <div className={styles.calculatorField}>
                  <label className={styles.calculatorLabel}>
                    <span className={styles.calculatorLabelText}>ИМТ(кг/м²)</span>
                    <input
                      type="number"
                      className={styles.calculatorInput}
                      value={calculatorParams.col_85}
                      onChange={(e) => handleCalculatorParamChange('col_85', e.target.value)}
                      disabled={isCalculating}
                      min="10"
                      max="50"
                      step="0.1"
                      placeholder="---"
                    />
                  </label>
                </div>

                <div className={styles.calculatorField}>
                  <label className={styles.calculatorLabel}>
                    <span className={styles.calculatorLabelText}>Индекс Бартел</span>
                    <input
                      type="number"
                      className={styles.calculatorInput}
                      value={calculatorParams.col_232}
                      onChange={(e) => handleCalculatorParamChange('col_232', e.target.value)}
                      disabled={isCalculating}
                      min="0"
                      max="100"
                      step="5"
                      placeholder="---"
                    />
                  </label>
                </div>

                <div className={styles.calculatorField}>
                  <label className={styles.calculatorLabel}>
                    <span className={styles.calculatorLabelText}>SPPB(сумма баллов, 0-12)</span>
                    <input
                      type="number"
                      className={styles.calculatorInput}
                      value={calculatorParams.col_249}
                      onChange={(e) => handleCalculatorParamChange('col_249', e.target.value)}
                      disabled={isCalculating}
                      min="0"
                      max="12"
                      step="1"
                      placeholder="---"
                    />
                  </label>
                </div>

                <div className={styles.calculatorField}>
                  <label className={styles.calculatorLabel}>
                    <span className={styles.calculatorLabelText}>Тест «Встань и иди» (время в секундах)</span>
                    <input
                      type="number"
                      className={styles.calculatorInput}
                      value={calculatorParams.col_252}
                      onChange={(e) => handleCalculatorParamChange('col_252', e.target.value)}
                      disabled={isCalculating}
                      step="0.01"
                      min="0"
                      placeholder="---"
                    />
                  </label>
                </div>

                <div className={styles.calculatorField}>
                  <label className={styles.calculatorLabel}>
                    <span className={styles.calculatorLabelText}>Ходьба на 4 м</span>
                    <select
                      className={styles.calculatorSelect}
                      value={calculatorParams.col_245}
                      onChange={(e) => handleCalculatorParamChange('col_245', e.target.value)}
                      disabled={isCalculating}
                    >
                      <option value="">Выберите результат</option>
                      <option value="Не может выполнить">Не может выполнить</option>
                      <option value="≥8,71 с">≥8,71 с</option>
                      <option value="6,21–8,70 с">6,21–8,70 с</option>
                      <option value="4,82–6,20 с">4,82–6,20 с</option>
                      <option value="≤4,81 с">≤4,81 с</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className={styles.calculatorActions}>
                <button
                  onClick={handleCalculateActivity}
                  disabled={isCalculating}
                  className={styles.calculatorButtonPrimary}
                >
                  {isCalculating ? (
                    <>
                      <span className={styles.calculatorSpinner}></span>
                      Расчёт...
                    </>
                  ) : (
                    '🧮 Рассчитать уровень ФА'
                  )}
                </button>
                <button
                  onClick={clearCalculator}
                  disabled={isCalculating}
                  className={styles.calculatorButtonPrimary}
                >
                  🗑️ Очистить
                </button>
              </div>

              {calculatorResult && (
                <div className={styles.calculatorResult}>
                  <div className={styles.calculatorResultHeader}>
                    <h4 className={styles.calculatorResultTitle}>Результат расчёта</h4>
                  </div>
                  <div className={styles.calculatorResultContent}>
                    <div 
                      className={styles.calculatorResultLevel}
                      style={{ 
                        backgroundColor: getLevelColor(parseInt(calculatorResult.match(/\((\d)\s*ур\.\)/)?.[1] || 0)) + '20',
                        borderColor: getLevelColor(parseInt(calculatorResult.match(/\((\d)\s*ур\.\)/)?.[1] || 0))
                      }}
                    >
                      <span 
                        className={styles.calculatorResultLevelText}
                        style={{ color: getLevelColor(parseInt(calculatorResult.match(/\((\d)\s*ур\.\)/)?.[1] || 0)) }}
                      >
                        {calculatorResult}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {calculatorResult && selectedPatient && showSaveButton && (
                  <button 
                    onClick={handleSaveResult}
                    className={styles.calculatorButtonSecondary}
                  >
                    💾 Сохранить результат
                  </button>
                )}

              {error && (
                <div className={styles.calculatorError}>
                  <span className={styles.calculatorErrorIcon}>⚠️</span>
                  <span className={styles.calculatorErrorText}>{error}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <details className="details" open={expandedSections['autoAssessment']} onToggle={() => toggleSection('autoAssessment')}>
          <summary className={styles.sectionTitleCollapsible}>Автоматическая оценка уровня ФА</summary>
          <div className={styles.sectionContent}>
            <div className={styles.fieldGroup}>
              <label className="input-label">
                <span className="label-text">Код пациента</span>
                <select
                  className={styles.inputFieldSelect}
                  value={selectedPatient}
                  onChange={handlePatientSelect}
                  disabled={loading}
                >
                  <option value="">Выберите пациента</option>
                  {patients.map((patient) => (
                    <option key={patient.code} value={patient.code}>
                      {patient.code} - {patient.gender}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            
            {/* Кнопки для оценки и сохранения */}
            <div className={styles.fieldGroup}>
              <button
                onClick={handlePredictActivity}
                disabled={isPredicting || !selectedPatient}
                className="btn btn-primary"
              >
                {isPredicting ? 'Оценка...' : 'Оценить уровень ФА'}
              </button>
              
              {predictMessage && (
                <div>
                  <p style={{ color: getLevelColor(parseInt(predictMessage.match(/\((\d)\s*ур\.\)/)?.[1] || 0)) }}>
                    {predictMessage}
                  </p>
                  <button 
                    onClick={handleSavePredictResult}
                    className="btn btn-secondary"
                  >
                    💾 Сохранить результат
                  </button>
                </div>
              )}
            </div>
          </div>
        </details>
      </section>

      <section className="section">
        <details className="details" open={expandedSections['manualAssessment']} onToggle={() => toggleSection('manualAssessment')}>
          <summary className={styles.sectionTitleCollapsible}>Оценка уровня ФА - ЛФК</summary>
          <div className={styles.sectionContent}>
            <div className={styles.activityTableContainer}>
              <h3 className={styles.activitySectionTitle}>Анаэробные (силовые) упражнения</h3>
              <table className={styles.activityTable}>
                <thead>
                  <tr>
                    <th>Исходное положение: сидя</th>
                    <th>1</th>
                    <th>2</th>
                    <th>3</th>
                    <th>4</th>
                    <th>5</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Сгибание рук с гантелями', field: 'anaerobic_squat' },
                    { label: 'Сгибание и разгибание рук с эспандером', field: 'anaerobic_expander' },
                    { label: 'Отжимание полулёжа (каждую ногу)', field: 'anaerobic_pushup' },
                    { label: 'Для мышц ног, с лентой-эспандером (каждую ногу)', field: 'anaerobic_leg' },
                    { label: 'Боковое отведение ноги (каждую ногу)', field: 'anaerobic_sideleg' },
                  ].map(({ label, field }) => (
                    <tr key={field}>
                      <td>{label}</td>
                      {['1x10', '2x10', '2x12', '3x10', '3x12'].map((option, idx) => (
                        <td key={option} className={`${styles.activityCell} ${styles[`level${idx + 1}`]}`}>
                          <div
                            className={`${styles.activityCellContent} ${formData[field] === option ? styles.selected : ''}`}
                            onClick={() => handleInputChange(field, option)}
                          >
                            {option}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <table className={styles.activityTable}>
                <thead>
                  <tr>
                    <th>Исходное положение: стоя</th>
                    <th>1</th>
                    <th>2</th>
                    <th>3</th>
                    <th>4</th>
                    <th>5</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Подъём на носки', field: 'standing_toes' },
                    { label: 'Боковое отведение ноги (каждую ногу)', field: 'standing_sideleg' },
                    { label: 'Подъём со стула', field: 'standing_chair' },
                    { label: 'Приседания', field: 'standing_squat' },
                  ].map(({ label, field }) => (
                    <tr key={field}>
                      <td>{label}</td>
                      {['1x10', '2x10', '2x12', '3x10', '3x12'].map((option, idx) => (
                        <td key={option} className={`${styles.activityCell} ${styles[`level${idx + 1}`]}`}>
                          <div
                            className={`${styles.activityCellContent} ${formData[field] === option ? styles.selected : ''}`}
                            onClick={() => handleInputChange(field, option)}
                          >
                            {option}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {formData.anaerobic_level > 0 && (
                <div className={styles.activityResult}>
                  <p style={{ color: getLevelColor(formData.anaerobic_level) }}>
                    Анаэробные (силовые упражнения) — уровень физической активности {formData.anaerobic_level}
                  </p>
                </div>
              )}
              {formData.anaerobic_level > 0 && (
                <div className={styles.activityResult}>
                  <p style={{ color: getLevelColor(formData.overall_level), fontWeight: 600 }}>
                    Общий уровень физической активности: {formData.overall_level}
                  </p>
                </div>
              )}

              <h3 className={styles.activitySectionTitle}>Кардиоваскулярные упражнения (ходьба)</h3>
              <p className={styles.activityDescription}>Делайте нагрузку, затем отдых между подходами не менее 1 минуты</p>
              <table className={styles.activityTable}>
                <thead>
                  <tr>
                    <th>Ходьба (во время выполнения упражнения — контроль АД, пульс)</th>
                    <th>Этап 1</th>
                    <th>Этап 2</th>
                    <th>Этап 3</th>
                    <th>Этап 4</th>
                    <th>Этап 5</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Ходьба (во время выполнения упражнения — контроль АД, пульс)</td>
                    {[
                      '2 подхода по 2–5 минут',
                      '3 подхода по 8 минут',
                      '3 подхода по 10 минут',
                      '3 подхода по 15 минут',
                      '2 подхода по 20 минут',
                    ].map((option, idx) => (
                      <td key={option} className={`${styles.activityCell} ${styles[`cardioLevel${idx + 1}`]}`}>
                        <div
                          className={`${styles.activityCellContent} ${formData.cardio_walking === option ? styles.selected : ''}`}
                          onClick={() => handleInputChange('cardio_walking', option)}
                        >
                          {option}
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
              {formData.cardio_level > 0 && (
                <div className={styles.activityResult}>
                  <p style={{ color: getLevelColor(formData.cardio_level) }}>
                    Кардиоваскулярные упражнения (ходьба) — уровень физической активности {formData.cardio_level}
                  </p>
                </div>
              )}
              {formData.cardio_level > 0 && (
                <div className={styles.activityResult}>
                  <p style={{ color: getLevelColor(formData.overall_level), fontWeight: 600 }}>
                    Общий уровень физической активности: {formData.overall_level}
                  </p>
                </div>
              )}

              <h3 className={styles.activitySectionTitle}>Упражнения на баланс</h3>
              <p className={styles.activityDescription}>Делайте паузу для отдыха между подходами от 1 до 3 минут</p>
              <table className={styles.activityTable}>
                <thead>
                  <tr>
                    <th>Упражнение</th>
                    <th>Этап 1</th>
                    <th>Этап 2</th>
                    <th>Этап 3</th>
                    <th>Этап 4</th>
                    <th>Этап 5</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Ходьба по прямой линии (шаги выполняются сначала в одну, потом в обратную сторону)', field: 'balance_line_walking' },
                    { label: 'Сгибание в коленном суставе со скрещенными руками на груди (на каждую ногу)', field: 'balance_knee_bend' },
                    { label: 'Подъем на носки и пятки (*счет выполняется сначала на носках, потом на пятках)', field: 'balance_toes_heels' },
                    { label: 'Ходьба на носках и пятках (*счет выполняется сначала на носках, потом на пятках)', field: 'balance_toes_heels_walking' },
                    { label: 'Дополнительное упражнение для 5-го уровня физической активности. Ходьба с изменением направления - вымышленная «восьмерка»', field: 'balance_eight_walking' },
                  ].map(({ label, field }) => (
                    <tr key={field}>
                      <td>{label}</td>
                      {field === 'balance_eight_walking'
                        ? ['', '', '', '', '3 подхода по 2 круга'].map((option, idx) => (
                            <td key={option || idx} className={`${styles.activityCell} ${styles[`balanceLevel${idx + 1}`]}`}>
                              {option ? (
                                <div
                                  className={`${styles.activityCellContent} ${formData[field] === option ? styles.selected : ''}`}
                                  onClick={() => handleInputChange(field, option)}
                                >
                                  {option}
                                </div>
                              ) : (
                                <div className={`${styles.activityCellContent} ${styles.disabled}`}>-</div>
                              )}
                            </td>
                          ))
                        : [
                            '3 подхода по 10 шагов',
                            '3 подхода по 15 шагов',
                            '3 подхода по 20 шагов',
                            '3 подхода по 25 шагов',
                            '3 подхода по 30 шагов',
                          ].map((option, idx) => (
                            <td key={option} className={`${styles.activityCell} ${styles[`balanceLevel${idx + 1}`]}`}>
                              <div
                                className={`${styles.activityCellContent} ${formData[field] === option ? styles.selected : ''}`}
                                onClick={() => handleInputChange(field, option)}
                              >
                                {option}
                              </div>
                            </td>
                          ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {formData.balance_level > 0 && (
                <div className={styles.activityResult}>
                  <p style={{ color: getLevelColor(formData.balance_level) }}>
                    Упражнения на баланс — уровень физической активности {formData.balance_level}
                  </p>
                </div>
              )}
              {formData.balance_level > 0 && (
                <div className={styles.activityResult}>
                  <p style={{ color: getLevelColor(formData.overall_level), fontWeight: 600 }}>
                    Общий уровень физической активности: {formData.overall_level}
                  </p>
                </div>
              )}

              <h3 className={styles.activitySectionTitle}>Упражнения на растяжку (подходы/повторения)</h3>
              <h4 className={styles.activitySubsectionTitle}>Исходное положение: стоя</h4>
              <table className={styles.activityTable}>
                <thead>
                  <tr>
                    <th>Упражнение</th>
                    <th>Уровень физ. активности 1</th>
                    <th>Уровни физ. активности 2–5</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Упражнение на растяжку мышц рук', field: 'stretch_arms' },
                    { label: 'Упражнение на растяжку мышц плеч (*каждой рукой)', field: 'stretch_shoulders' },
                    { label: 'Для растяжения мышц бедра (*на каждую ногу)', field: 'stretch_thighs' },
                    { label: 'Упражнение для растяжения мышц шеи (*в каждую сторону)', field: 'stretch_neck' },
                  ].map(({ label, field }) => (
                    <tr key={field}>
                      <td>{label}</td>
                      {['3x2', '3x3'].map((option, idx) => (
                        <td key={option} className={`${styles.activityCell} ${styles[`stretchingLevel${idx + 1}`]}`}>
                          <div
                            className={`${styles.activityCellContent} ${formData[field] === option ? styles.selected : ''}`}
                            onClick={() => handleInputChange(field, option)}
                          >
                            {option}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <h4 className={styles.activitySubsectionTitle}>Исходное положение: сидя</h4>
              <table className={styles.activityTable}>
                <thead>
                  <tr>
                    <th>Упражнение</th>
                    <th>Уровень физ. активности 1</th>
                    <th>Уровни физ. активности 2–5</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Упражнения для растяжения мышц голеностопного сустава (*каждой ногой и в каждую сторону)', field: 'stretch_ankle' },
                    { label: 'Для растяжения мышц плеча и верхне-задней части грудной клетки', field: 'stretch_shoulder_upper_back' },
                    { label: 'Упражнение для растяжки задней части бедра', field: 'stretch_hamstring' },
                  ].map(({ label, field }) => (
                    <tr key={field}>
                      <td>{label}</td>
                      {['3x2', '3x3'].map((option, idx) => (
                        <td key={option} className={`${styles.activityCell} ${styles[`stretchingLevel${idx + 1}`]}`}>
                          <div
                            className={`${styles.activityCellContent} ${formData[field] === option ? styles.selected : ''}`}
                            onClick={() => handleInputChange(field, option)}
                          >
                            {option}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {formData.stretching_level > 0 && (
                <div className={styles.activityResult}>
                  <p style={{ color: getLevelColor(formData.stretching_level) }}>
                    Упражнения на растяжку — уровень физической активности {formData.stretching_level}
                  </p>
                </div>
              )}
              {formData.stretching_level > 0 && (
                <div className={styles.activityResult}>
                  <p style={{ color: getLevelColor(formData.overall_level), fontWeight: 600 }}>
                    Общий уровень физической активности: {formData.overall_level}
                  </p>
                </div>
              )}
            </div>
            {formData.overall_level > 0 && (
              <div>
                <p style={{ color: getLevelColor(formData.overall_level), fontWeight: 600, marginTop: '1rem' }}>
                  Общий уровень физической активности: {formData.overall_level}
                </p>
                <button 
                  onClick={handleSaveLFKResult}
                  className="btn btn-secondary"
                  disabled={!selectedPatient}
                >
                  💾 Сохранить результат ЛФК
                </button>
              </div>
            )}
          </div>
        </details>
      </section>
    </div>
  );
}

export default LevelFA;