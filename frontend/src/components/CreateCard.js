/* frontend/src/components/CreateCard.js*/

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './CreateCard.module.css';

function CreateCard() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});

  const norms = {
    '11': { min: 19, max: 25 },
    '22': { male: { min: 23 }, female: { min: 22 } },
    '23': { min: 31 },
    '67': { male: { min: 130, max: 170 }, female: { min: 120, max: 150 } },
    '68': { male: { min: 4.0, max: 5.5 }, female: { min: 3.5, max: 5.0 } },
    '69': { min: 4.0, max: 9.0 },
    '70': { min: 1.0, max: 3.0 },
    '71': { min: 150, max: 400 },
    '72': { male: { min: 0, max: 15 }, female: { min: 0, max: 20 } },
    '73': { min: 65, max: 85 },
    '74': { min: 35, max: 50 },
    '75': { male: { min: 62, max: 115 }, female: { min: 44, max: 97 } },
    '76': { min: 60 },
    '77': { min: 4.0, max: 5.6 },
    '78': { min: 3.3, max: 5.5 },
    '79': { min: 10, max: 40 },
    '80': { min: 10, max: 40 },
    '81': { min: 3, max: 17 },
    '82': { male: { min: 202, max: 416 }, female: { min: 143, max: 339 } },
    '83': { max: 5.2 },
    '84': { max: 3.0 },
    '85': { male: { min: 1.0 }, female: { min: 1.2 } },
    '86': { max: 1.7 },
    '87': { min: 1.12, max: 1.32 },
    '88': { min: 2.20, max: 2.60 },
    '89': { max: 5 },
    '90': { min: 10, max: 30 },
    '91': { male: { min: 30, max: 400 }, female: { min: 15, max: 150 } },
    '92': { min: 30 },
    '93': { min: 0.4, max: 4.0 },
    '94': { min: 200, max: 900 },
    '95': { min: 3, max: 20 },
    '396': { max: 3 }
  };

  const handleInputChange = (fieldId, value) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    setErrors(prev => ({ ...prev, [fieldId]: '' }));

    if (fieldId === '9' || fieldId === '10') {
      const height = fieldId === '9' ? parseFloat(value) : parseFloat(formData['9']);
      const weight = fieldId === '10' ? parseFloat(value) : parseFloat(formData['10']);
      if (height && weight && !isNaN(height) && !isNaN(weight) && height > 0) {
        const bmi = (weight / ((height / 100) ** 2)).toFixed(1);
        setFormData(prev => ({ ...prev, '11': bmi }));
      }
    }

    const scales = {
      SPPB: { fields: ['419', '420', '421', '422', '423'], totalField: '424' },
      Barthel: { fields: ['844', '845', '846', '847', '848', '849', '850', '851', '852', '853'], totalField: '854' },
      Lawton: { fields: ['425', '426', '427', '428', '429', '430', '431', '432'], totalField: '433' },
      MMSE: { fields: ['551', '552', '553', '554', '555', '556', '557', '558', '559', '560'], totalField: '562' },
      MOCA: { fields: ['610', '611', '612', '613', '614', '615', '616', '617', '618', '619', '620', '621', '622'], totalField: '623' },
      EQ5D: { fields: ['391', '392', '393', '394', '395'], totalField: '396' },
      MNA: { fields: ['397', '398', '399', '400', '401', '402', '403', '404', '405', '406', '407', '408', '409', '410', '411', '412'], totalField: '415' }
    };

    Object.entries(scales).forEach(([_, { fields, totalField }]) => {
      if (fields.includes(fieldId)) {
        const scores = fields.map(id => parseInt(formData[id] || '0'));
        const total = scores.reduce((sum, score) => sum + score, 0);
        setFormData(prev => ({ ...prev, [totalField]: total }));
      }
    });

    if (['854', '433', '562', '27', '415', '336', '102'].includes(fieldId)) {
      const barthel = parseInt(formData['854'] || '0');
      const lawton = parseInt(formData['433'] || '0');
      const mmse = parseInt(formData['562'] || '0');
      const charlson = parseInt(formData['27'] || '0');
      const mna = parseFloat(formData['415'] || '0');
      const medications = (formData['336'] || '').split(',').filter(Boolean).length;
      const socialStatus = formData['102'] || '';

      let giz = 0;
      giz += barthel >= 91 && barthel <= 100 ? 1 : 0;
      giz += lawton >= 6 && lawton <= 8 ? 1 : 0;
      giz += mmse >= 28 && mmse <= 30 ? 1 : mmse >= 24 && mmse <= 27 ? 0.5 : 0;
      giz += charlson === 0 ? 1 : charlson >= 1 && charlson <= 2 ? 0.5 : 0;
      giz += mna >= 24 ? 1 : mna >= 17 && mna <= 23.5 ? 0.5 : 0;
      giz += medications >= 0 && medications <= 3 ? 1 : medications >= 4 && medications <= 6 ? 0.5 : 0;
      giz += /Один/.test(socialStatus) ? 0 : 1;

      setFormData(prev => ({ ...prev, 'giz': giz.toFixed(1) }));
    }

    const activityFields = [
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

    if (activityFields.includes(fieldId)) {
      const pointsMap = {
        '1x10': 1,
        '2x10': 2,
        '2x12': 3,
        '3x10': 4,
        '3x12': 5,
      };

      const selectedValues = activityFields
        .map(field => formData[field])
        .filter(val => val);

      if (selectedValues.length > 0) {
        const totalPoints = selectedValues.reduce((sum, val) => sum + (pointsMap[val] || 0), 0);
        const average = Math.round(totalPoints / selectedValues.length);
        setFormData(prev => ({ ...prev, 'anaerobic_level': average }));
      } else {
        setFormData(prev => ({ ...prev, 'anaerobic_level': null }));
      }
    }
  };

  useEffect(() => {
    const cardioValue = formData['cardio_walking'];
    let cardioLevel = 0;

    if (cardioValue) {
      switch (cardioValue) {
        case '2 подхода по 2–5 минут':
          cardioLevel = 1;
          break;
        case '3 подхода по 8 минут':
          cardioLevel = 2;
          break;
        case '3 подхода по 10 минут':
          cardioLevel = 3;
          break;
        case '3 подхода по 15 минут':
          cardioLevel = 4;
          break;
        case '2 подхода по 20 минут':
          cardioLevel = 5;
          break;
        default:
          cardioLevel = 0;
      }
    }

    setFormData((prev) => ({
      ...prev,
      cardio_level: cardioLevel,
    }));
  }, [formData.cardio_walking, formData]);

  useEffect(() => {
    const balanceFields = [
      'balance_line_walking',
      'balance_knee_bend',
      'balance_toes_heels',
      'balance_toes_heels_walking',
      'balance_eight_walking'
    ];

    const balanceValues = balanceFields.map(field => formData[field]).filter(val => val);
    let balanceLevel = 0;

    if (balanceValues.length > 0) {
      const levels = balanceValues.map(value => {
        switch (value) {
          case '3 подхода по 10 шагов':
          case '3 подхода по 10 счетов':
            return 1;
          case '3 подхода по 15 шагов':
          case '3 подхода по 15 счетов':
            return 2;
          case '3 подхода по 20 шагов':
          case '3 подхода по 20 счетов':
            return 3;
          case '3 подхода по 25 шагов':
          case '3 подхода по 25 счетов':
            return 4;
          case '3 подхода по 30 шагов':
          case '3 подхода по 30 счетов':
          case '3 подхода по 2 круга':
            return 5;
          default:
            return 0;
        }
      });
      balanceLevel = Math.max(...levels);
    }

    setFormData((prev) => ({
      ...prev,
      balance_level: balanceLevel,
    }));
  }, [
    formData.balance_line_walking,
    formData.balance_knee_bend,
    formData.balance_toes_heels,
    formData.balance_toes_heels_walking,
    formData.balance_eight_walking,
    formData
  ]);

  useEffect(() => {
    const stretchingFields = [
      'stretch_arms',
      'stretch_shoulders',
      'stretch_thighs',
      'stretch_neck',
      'stretch_ankle',
      'stretch_shoulder_upper_back',
      'stretch_hamstring'
    ];

    const stretchingValues = stretchingFields.map(field => formData[field]).filter(val => val);
    let stretchingLevel = 0;

    if (stretchingValues.length > 0) {
      const hasLevel2 = stretchingValues.includes('3x3');
      stretchingLevel = hasLevel2 ? 2 : 1;
    }

    setFormData((prev) => ({
      ...prev,
      stretching_level: stretchingLevel,
    }));
  }, [
    formData.stretch_arms,
    formData.stretch_shoulders,
    formData.stretch_thighs,
    formData.stretch_neck,
    formData.stretch_ankle,
    formData.stretch_shoulder_upper_back,
    formData.stretch_hamstring,
    formData
  ]);

  const isOutOfRange = (fieldId, value) => {
    if (!norms[fieldId] || !value) return false;
    const norm = norms[fieldId];
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return false;

    const gender = formData['2'];
    if (norm.male && norm.female && gender) {
      const genderNorm = gender === 'Мужской' ? norm.male : norm.female;
      return (genderNorm.min && numValue < genderNorm.min) || (genderNorm.max && numValue > genderNorm.max);
    }
    return (norm.min && numValue < norm.min) || (norm.max && numValue > norm.max);
  };

  const handleSubmit = async () => {
    const requiredFields = ['1', '2', '9', '10', '11', '30'];
    const newErrors = {};
    requiredFields.forEach(field => {
      if (!formData[field]) {
        newErrors[field] = 'Обязательное поле';
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      alert('Пожалуйста, заполните все обязательные поля');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/create-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: formData })
      });
      const result = await response.json();
      if (response.ok) {
        alert('Карта успешно сохранена');
        navigate('/doctor-dashboard');
      } else {
        throw new Error(result.detail || 'Ошибка сохранения');
      }
    } catch (error) {
      alert(`Ошибка: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const renderInput = (fieldId, label, type = 'text', options = [], required = false, readOnly = false) => {
    const isSelect = type === 'select';
    const isCheckbox = type === 'checkbox';
    const isTextarea = type === 'textarea';
    const value = isCheckbox ? (formData[fieldId] || []) : (formData[fieldId] || '');
    const error = errors[fieldId];
    const outOfRange = isOutOfRange(fieldId, value);

    return (
      <label className="input-label">
        <span className="label-text">
          {label}
          {required && <span className={styles.required}>*</span>}
        </span>
        {isSelect ? (
          <select
            value={value}
            onChange={(e) => handleInputChange(fieldId, e.target.value)}
            className={`input-field ${outOfRange ? styles.outOfRange : ''}`}
            disabled={readOnly}
          >
            <option value="">Выберите...</option>
            {options.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        ) : isCheckbox ? (
          <div className={styles.checkboxGroup}>
            {options.map(opt => (
              <label key={opt} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={value.includes(opt)}
                  onChange={(e) => {
                    const newValue = e.target.checked
                      ? [...value, opt]
                      : value.filter(v => v !== opt);
                    handleInputChange(fieldId, newValue);
                  }}
                  disabled={readOnly}
                />
                {opt}
              </label>
            ))}
          </div>
        ) : isTextarea ? (
          <textarea
            value={value}
            onChange={(e) => handleInputChange(fieldId, e.target.value)}
            className={`input-field textarea ${outOfRange ? styles.outOfRange : ''}`}
            readOnly={readOnly}
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={(e) => handleInputChange(fieldId, e.target.value)}
            className={`input-field ${outOfRange ? styles.outOfRange : ''}`}
            readOnly={readOnly}
          />
        )}
        {norms[fieldId] && (
          <span className={styles.normInfo}>
            Норма: {norms[fieldId].male && norms[fieldId].female
              ? (formData['2'] === 'Мужской'
                ? `${norms[fieldId].male.min || ''} - ${norms[fieldId].male.max || ''}`
                : `${norms[fieldId].female.min || ''} - ${norms[fieldId].female.max || ''}`)
              : `${norms[fieldId].min || ''} - ${norms[fieldId].max || ''}`}
          </span>
        )}
        {error && <span className="error">{error}</span>}
      </label>
    );
  };

  const renderDiseaseList = (fieldId, label, stageFieldId) => {
    const diseases = formData[fieldId] ? JSON.parse(formData[fieldId] || '[]') : [];
    const stages = formData[stageFieldId] ? JSON.parse(formData[stageFieldId] || '[]') : [];

    const addDisease = () => {
      handleInputChange(fieldId, JSON.stringify([...diseases, '']));
      handleInputChange(stageFieldId, JSON.stringify([...stages, '']));
    };

    return (
      <div className={styles.diseaseList}>
        <span className="label-text">{label}</span>
        {diseases.map((disease, index) => (
          <div key={index} className={styles.diseaseEntry}>
            <input
              type="text"
              value={disease}
              onChange={(e) => {
                const newDiseases = [...diseases];
                newDiseases[index] = e.target.value;
                handleInputChange(fieldId, JSON.stringify(newDiseases));
              }}
              className="input-field"
              placeholder="Название заболевания"
            />
            <input
              type="text"
              value={stages[index] || ''}
              onChange={(e) => {
                const newStages = [...stages];
                newStages[index] = e.target.value;
                handleInputChange(stageFieldId, JSON.stringify(newStages));
              }}
              className="input-field"
              placeholder="Стадийность"
            />
          </div>
        ))}
        <button type="button" onClick={addDisease} className="btn btn-primary mt-2">
          Добавить заболевание
        </button>
      </div>
    );
  };

  return (
    <div className="container">
    <header className={styles.fixedHeader}>
      <h1 className="title">Создание карты пациента</h1>
      <button onClick={() => navigate('/doctor-dashboard')} className={styles.btnBack}>
        Назад
      </button>
      
      <button onClick={handleSubmit} disabled={isSaving} className={styles.btnSave}>
        {isSaving ? 'Сохранение...' : 'Сохранить карту'}
      </button>
    </header>

      <section className="section">
        <h2 className="section-title">Общая информация о пациенте</h2>
        <div className={styles.grid}>
          {renderInput('1', 'Код карты', 'text', [], true)}
          {renderInput('2', 'Пол', 'select', ['Мужской', 'Женский'], true)}
          {renderInput('Age', 'Возраст (полных лет)', 'number')}
          {renderInput('96', 'Этаж проживания', 'number')}
          {renderInput('97', 'Профессия', 'text')}
          {renderInput('98', 'Пользуется лифтом', 'select', ['Да', 'Нет'])}
          {renderInput('99', 'Образование', 'select', [
            'Неполное среднее', 'Среднее', 'Среднее профессиональное', 'Высшее', 'Другое'
          ])}
          {formData['99'] === 'Другое' && renderInput('103', 'Образование (уточнение)', 'text')}
          {renderInput('100', 'Семейный статус', 'select', [
            'Не состоит в браке', 'Женат/Замужем', 'Вдовец/Вдова', 'Разведён(а)', 'Другое'
          ])}
          {formData['100'] === 'Другое' && renderInput('103', 'Семейный статус (уточнение)', 'text')}
          {renderInput('101', 'Сфера профессиональных интересов', 'text')}
          {renderInput('102', 'С кем проживает', 'select', [
            'Один(а)', 'С супругом(ой)', 'С детьми', 'С родственниками', 'В учреждении', 'Другое'
          ])}
          {formData['102'] === 'Другое' && renderInput('103', 'С кем проживает (уточнение)', 'text')}
          {renderInput('104', 'Работает в настоящее время', 'select', ['Да', 'Нет'])}
          {renderInput('105', 'Инвалидность', 'select', ['Нет', 'I группа', 'II группа', 'III группа'])}
          {renderInput('106', 'Уровень дохода', 'select', ['Низкий', 'Средний', 'Высокий'])}
        </div>
      </section>

      <section className="section">
        <details className={styles.details} open={expandedSections['criteria']} onToggle={() => toggleSection('criteria')}>
          <summary className="section-title">Критерии включения в программу</summary>
          <div className={styles.grid}>
            {renderInput('375', 'Состояние после выписки из стационара', 'select', ['Да', 'Нет'])}
            {formData['375'] === 'Да' && (
              <>
                {renderInput('376', 'Причина госпитализации', 'text')}
                {renderInput('377', 'Дата выписки из стационара', 'date')}
              </>
            )}
            {renderInput('378', 'Состояние, повлекшее острое нарушение', 'select', ['Да', 'Нет'])}
            {formData['378'] === 'Да' && renderInput('379', 'Описание состояния', 'textarea')}
            {renderInput('380', 'Нарушения походки и подвижности (R26)', 'select', ['Да', 'Нет'])}
            {renderInput('381', 'Другое', 'select', ['Да', 'Нет'])}
            {formData['381'] === 'Да' && renderInput('382', 'Другое — уточнение', 'text')}
            {renderInput('383', 'Возраст 60+ с преастенией/астенией', 'select', ['Да', 'Нет'])}
            {renderInput('384', 'Подписанное информированное согласие', 'select', ['Да', 'Нет'])}
            {renderInput('385', 'Показания к гериатрической реабилитации', 'select', ['Да', 'Нет'])}
            {renderInput('386', 'Противопоказания к восстановительной терапии', 'select', ['Да', 'Нет'])}
            {renderInput('387', 'Острые/обострения хронических заболеваний', 'select', ['Да', 'Нет'])}
            {renderInput('388', 'Противопоказания к элементам программы', 'select', ['Да', 'Нет'])}
            {renderInput('389', 'Отказ от участия', 'select', ['Да', 'Нет'])}
            {renderInput('390', 'Пациент соответствует критериям', 'select', ['Да', 'Нет'])}
          </div>
        </details>
      </section>

      <section className="section">
        <h2 className="section-title">Жалобы</h2>
        <div className={styles.grid}>
          {renderInput('Complaints', 'Жалобы', 'textarea')}
          <div className={styles.checkboxGroup}>
            {['Нарушения глотания', 'Нарушения жевания', 'Неудовлетворительное состояние зубов', 
              'Нарушения речи', 'Страх падений', 'Хроническая боль'].map(complaint => (
              <label key={complaint} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  onChange={(e) => {
                    const current = formData['Complaints'] || '';
                    const newComplaints = e.target.checked
                      ? current ? `${current}, ${complaint}` : complaint
                      : current.replace(new RegExp(`(, )?${complaint}`), '');
                    handleInputChange('Complaints', newComplaints);
                  }}
                />
                {complaint}
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Анамнез заболеваний</h2>
        <div className={styles.grid}>
          {renderDiseaseList('30', 'Хронические заболевания', '30_stage')}
          {renderDiseaseList('32', 'Диагноз при выписке', '32_stage')}
          {renderInput('37', 'Вероятность саркопении', 'select', ['Вероятность повышена', 'Вероятность снижена'])}
          {renderInput('416', 'Клиническая шкала старческой астении', 'select', [
            '3 – Удовлетворительное состояние', '4 – Преастения', '5 – Лёгкая старческая астения'
          ])}
          {renderInput('417', 'Степень тяжести СА (балл)', 'number')}
          {renderInput('418', 'Шкала старческой астении (итоговый балл)', 'number')}
        </div>
      </section>

      <section className="section">
        <details className={styles.details} open={expandedSections['epidemiology']} onToggle={() => toggleSection('epidemiology')}>
          <summary className="section-title">Эпидемиологический анамнез</summary>
          <div className={styles.grid}>
            {renderInput('38', 'Заболевание COVID', 'select', ['Да', 'Нет'])}
            {formData['38'] === 'Да' && (
              <>
                {renderInput('39', 'Год COVID', 'number')}
                {renderInput('40', 'Месяц COVID', 'select', [
                  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
                ])}
                {renderInput('41', 'Госпитализация по COVID', 'select', ['Да', 'Нет'])}
              </>
            )}
            {renderInput('46', 'Вакцинация против гриппа', 'select', ['Да', 'Нет'])}
            {formData['46'] === 'Да' && renderInput('47', 'Дата вакцинации (Грипп)', 'date')}
            {renderInput('48', 'Вакцинация против пневмококка', 'select', ['Да', 'Нет'])}
            {formData['48'] === 'Да' && renderInput('49', 'Дата вакцинации (Пневмококк)', 'date')}
            {renderInput('50', 'Вакцинация против других заболеваний', 'select', ['Да', 'Нет'])}
            {formData['50'] === 'Да' && renderInput('51', 'Другая вакцинация', 'text')}
          </div>
        </details>
      </section>

      <section className="section">
        <details className={styles.details} open={expandedSections['riskFactors']} onToggle={() => toggleSection('riskFactors')}>
          <summary className="section-title">Факторы риска хронизации</summary>
          <div className={styles.grid}>
            {renderInput('113', 'Курение', 'select', ['Не курит', 'Курит', 'Курил в прошлом'])}
            {formData['113'] === 'Курит' && renderInput('114', 'Курит на протяжении лет', 'number')}
            {formData['113'] === 'Курил в прошлом' && renderInput('115', 'Курил в прошлом на протяжении лет', 'number')}
            {['Курит', 'Курил в прошлом'].includes(formData['113']) && renderInput('116', 'Количество пачек в сутки', 'number')}
            {renderInput('117', 'Употребление алкоголя', 'select', ['Да', 'Нет'])}
            {formData['117'] === 'Да' && renderInput('118', 'Количество единиц алкоголя в день', 'number')}
            {renderInput('119', 'Физическая активность – кратность', 'select', [
              '<1 раза в месяц', '2–3 раза в неделю', 'Ежедневно'
            ])}
            {renderInput('120', 'Физическая активность – продолжительность', 'select', [
              '<30 мин', '30–60 мин', '1–4 часа', '4 часов'
            ])}
            {renderInput('121', 'Варианты физической активности', 'checkbox', [
              'Пешие прогулки', 'Скандинавская ходьба', 'Зарядка', 'Садовый участок', 'Физкультура', 'Работа на земельном участке'
            ])}
            {renderInput('122', 'Другие варианты физической активности', 'select', ['Да', 'Нет'])}
            {formData['122'] === 'Да' && renderInput('123', 'Другая физическая активность', 'text')}
            {renderInput('124', 'Физическая активность за неделю', 'select', ['<150 минут', '≥150 мин'])}
            {renderInput('125', 'С чем связано ограничение физической активности', 'checkbox', [
              'Артрит', 'Неустойчивость походки', 'Хроническая боль', 'Одышка', 'Проблемы с памятью',
              'Переломы', 'Боль в груди', 'Травмы', 'Последствия ОНМК', 'Снижение настроения', 'Другое'
            ])}
            {formData['125']?.includes('Другое') && renderInput('126', 'Другое ограничение физической нагрузки', 'text')}
            {formData['2'] === 'Женский' && renderInput('127', 'Возраст наступления менопаузы (лет)', 'number')}
          </div>
        </details>
      </section>

      <section className="section">
        <details className={styles.details} open={expandedSections['tests']} onToggle={() => toggleSection('tests')}>
          <summary className="section-title">Пробы</summary>
          <div className={styles.grid}>
            {renderInput('12', 'Ортостатическая проба', 'select', ['Отрицательная', 'Положительная'])}
            {renderInput('52', 'Вы боитесь упасть?', 'select', ['Да', 'Нет'])}
            {renderInput('53', 'Падения в течение последнего года', 'select', ['Да', 'Нет'])}
            {formData['53'] === 'Да' && renderInput('54', 'Уточнение падений', 'textarea')}
            {renderInput('55', 'Переломы у женщин в постменопаузе и у мужчин старше 50 лет', 'select', ['Да', 'Нет'])}
            {formData['55'] === 'Да' && renderInput('56', 'Уточнение переломов', 'textarea')}
            {renderInput('57', 'Дата проведения денситометрии', 'date')}
            {renderInput('58', 'Бедро – T-критерий (Total)', 'number')}
            {renderInput('59', 'Бедро – T-критерий (Neck)', 'number')}
            {renderInput('60', 'Бедро – МПК (BCM), г/см² (Total)', 'number')}
            {renderInput('61', 'Поясничный отдел позвоночника – T-критерий (Total)', 'number')}
            {renderInput('62', 'Поясничный отдел позвоночника – T-критерий (Худший результат)', 'number')}
            {renderInput('63', 'Поясничный отдел позвоночника – МПК (BCM), г/см² (Total)', 'number')}
            {renderInput('64', 'FRAX – % риск основных остеопоротических переломов', 'number')}
            {renderInput('65', 'FRAX – % риск переломов проксимального отдела бедра', 'number')}
            {renderInput('66', 'Заключение по денситометрии', 'select', ['Норма', 'Остеопения', 'Остеопороз', 'Тяжёлый остеопороз'])}
          </div>
        </details>
      </section>
      <section className="section">
        <h2 className="section-title">Антропометрические данные</h2>
        <div className={styles.grid}>
          {renderInput('9', 'Рост (см)', 'number', [], true)}
          {renderInput('10', 'Вес (кг)', 'number', [], true)}
          {renderInput('13', 'ИМТ (кг/м²)', 'number', [], true, true)}
          {renderInput('22', 'Окружность по середине плеча (см)', 'number')}
          {renderInput('23', 'Окружность голени (см)', 'number')}
        </div>
      </section>

      <section className="section">
  <details className={styles.details} open={expandedSections['physicalActivity']} onToggle={() => toggleSection('physicalActivity')}>
    <summary className="section-title">Оценка уровня физической активности</summary>
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
            <tr>
              <td>Сгибание рук с гантелями</td>
              {['1x10', '2x10', '2x12', '3x10', '3x12'].map((option, idx) => (
                <td key={option} className={`${styles.activityCell} ${styles[`level-${idx + 1}`]}`}>
                  <div
                    className={`${styles.activityCellContent} ${
                      formData['anaerobic_squat'] === option ? styles.selected : ''
                    }`}
                    onClick={() => handleInputChange('anaerobic_squat', option)}
                  >
                    {option}
                  </div>
                </td>
              ))}
            </tr>
            <tr>
              <td>Сгибание и разгибание рук с эспандером</td>
              {['1x10', '2x10', '2x12', '3x10', '3x12'].map((option, idx) => (
                <td key={option} className={`${styles.activityCell} ${styles[`level-${idx + 1}`]}`}>
                  <div
                    className={`${styles.activityCellContent} ${
                      formData['anaerobic_expander'] === option ? styles.selected : ''
                    }`}
                    onClick={() => handleInputChange('anaerobic_expander', option)}
                  >
                    {option}
                  </div>
                </td>
              ))}
            </tr>
            <tr>
              <td>Отжимание полулёжа (каждую ногу)</td>
              {['1x10', '2x10', '2x12', '3x10', '3x12'].map((option, idx) => (
                <td key={option} className={`${styles.activityCell} ${styles[`level-${idx + 1}`]}`}>
                  <div
                    className={`${styles.activityCellContent} ${
                      formData['anaerobic_pushup'] === option ? styles.selected : ''
                    }`}
                    onClick={() => handleInputChange('anaerobic_pushup', option)}
                  >
                    {option}
                  </div>
                </td>
              ))}
            </tr>
            <tr>
              <td>Для мышц ног, с лентой-эспандером (каждую ногу)</td>
              {['1x10', '2x10', '2x12', '3x10', '3x12'].map((option, idx) => (
                <td key={option} className={`${styles.activityCell} ${styles[`level-${idx + 1}`]}`}>
                  <div
                    className={`${styles.activityCellContent} ${
                      formData['anaerobic_leg'] === option ? styles.selected : ''
                    }`}
                    onClick={() => handleInputChange('anaerobic_leg', option)}
                  >
                    {option}
                  </div>
                </td>
              ))}
            </tr>
            <tr>
              <td>Боковое отведение ноги (каждую ногу)</td>
              {['1x10', '2x10', '2x12', '3x10', '3x12'].map((option, idx) => (
                <td key={option} className={`${styles.activityCell} ${styles[`level-${idx + 1}`]}`}>
                  <div
                    className={`${styles.activityCellContent} ${
                      formData['anaerobic_sideleg'] === option ? styles.selected : ''
                    }`}
                    onClick={() => handleInputChange('anaerobic_sideleg', option)}
                  >
                    {option}
                  </div>
                </td>
              ))}
            </tr>
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
            <tr>
              <td>Подъём на носки</td>
              {['1x10', '2x10', '2x12', '3x10', '3x12'].map((option, idx) => (
                <td key={option} className={`${styles.activityCell} ${styles[`level-${idx + 1}`]}`}>
                  <div
                    className={`${styles.activityCellContent} ${
                      formData['standing_toes'] === option ? styles.selected : ''
                    }`}
                    onClick={() => handleInputChange('standing_toes', option)}
                  >
                    {option}
                  </div>
                </td>
              ))}
            </tr>
            <tr>
              <td>Боковое отведение ноги (каждую ногу)</td>
              {['1x10', '2x10', '2x12', '3x10', '3x12'].map((option, idx) => (
                <td key={option} className={`${styles.activityCell} ${styles[`level-${idx + 1}`]}`}>
                  <div
                    className={`${styles.activityCellContent} ${
                      formData['standing_sideleg'] === option ? styles.selected : ''
                    }`}
                    onClick={() => handleInputChange('standing_sideleg', option)}
                  >
                    {option}
                  </div>
                </td>
              ))}
            </tr>
            <tr>
              <td>Подъём со стула</td>
              {['1x10', '2x10', '2x12', '3x10', '3x12'].map((option, idx) => (
                <td key={option} className={`${styles.activityCell} ${styles[`level-${idx + 1}`]}`}>
                  <div
                    className={`${styles.activityCellContent} ${
                      formData['standing_chair'] === option ? styles.selected : ''
                    }`}
                    onClick={() => handleInputChange('standing_chair', option)}
                  >
                    {option}
                  </div>
                </td>
              ))}
            </tr>
            <tr>
              <td>Приседания</td>
              {['1x10', '2x10', '2x12', '3x10', '3x12'].map((option, idx) => (
                <td key={option} className={`${styles.activityCell} ${styles[`level-${idx + 1}`]}`}>
                  <div
                    className={`${styles.activityCellContent} ${
                      formData['standing_squat'] === option ? styles.selected : ''
                    }`}
                    onClick={() => handleInputChange('standing_squat', option)}
                  >
                    {option}
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
        
        <div className={styles.activityResult}>
          {formData['anaerobic_level'] && (
            <p>
              Анаэробные (силовые упражнения) — уровень физической активности{' '}
              {formData['anaerobic_level']}
            </p>
          )}
        </div>

        <h3 className={styles.activitySectionTitle}>Кардиоваскулярные упражнения (ходьба)</h3>
        <p className={styles.activityDescription}>Делайте нагрузку для отдышки между подходами не менее 1 минуты</p>
        
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
                '2 подхода по 20 минут'
              ].map((option, idx) => (
                <td key={option} className={`${styles.activityCell} ${styles[`cardio-level-${idx + 1}`]}`}>
                  <div
                    className={`${styles.activityCellContent} ${
                      formData['cardio_walking'] === option ? styles.selected : ''
                    }`}
                    onClick={() => handleInputChange('cardio_walking', option)}
                  >
                    {option}
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>

        <div className={styles.activityResult}>
          {formData['cardio_level'] > 0 && (
            <p>
              Кардиоваскулярные упражнения (ходьба) — уровень физической активности{' '}
              {formData['cardio_level']}
            </p>
          )}
        </div>

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
            <tr>
              <td>Ходьба по прямой линии (шаги выполняются сначала в одну, потом в обратную сторону)</td>
              {[
                '3 подхода по 10 шагов',
                '3 подхода по 15 шагов',
                '3 подхода по 20 шагов',
                '3 подхода по 25 шагов',
                '3 подхода по 30 шагов'
              ].map((option, idx) => (
                <td key={option} className={`${styles.activityCell} ${styles[`balance-level-${idx + 1}`]}`}>
                  <div
                    className={`${styles.activityCellContent} ${
                      formData['balance_line_walking'] === option ? styles.selected : ''
                    }`}
                    onClick={() => handleInputChange('balance_line_walking', option)}
                  >
                    {option}
                  </div>
                </td>
              ))}
            </tr>
            <tr>
              <td>Сгибание в коленном суставе со скрещенными руками на груди (на каждую ногу)</td>
              {[
                '3 подхода по 10 счетов',
                '3 подхода по 15 счетов',
                '3 подхода по 20 счетов',
                '3 подхода по 25 счетов',
                '3 подхода по 30 счетов'
              ].map((option, idx) => (
                <td key={option} className={`${styles.activityCell} ${styles[`balance-level-${idx + 1}`]}`}>
                  <div
                    className={`${styles.activityCellContent} ${
                      formData['balance_knee_bend'] === option ? styles.selected : ''
                    }`}
                    onClick={() => handleInputChange('balance_knee_bend', option)}
                  >
                    {option}
                  </div>
                </td>
              ))}
            </tr>
            <tr>
              <td>Подъем на носки и пятки (*счет выполняется сначала на носках, потом на пятках)</td>
              {[
                '3 подхода по 10 счетов',
                '3 подхода по 15 счетов',
                '3 подхода по 20 счетов',
                '3 подхода по 25 счетов',
                '3 подхода по 30 счетов'
              ].map((option, idx) => (
                <td key={option} className={`${styles.activityCell} ${styles[`balance-level-${idx + 1}`]}`}>
                  <div
                    className={`${styles.activityCellContent} ${
                      formData['balance_toes_heels'] === option ? styles.selected : ''
                    }`}
                    onClick={() => handleInputChange('balance_toes_heels', option)}
                  >
                    {option}
                  </div>
                </td>
              ))}
            </tr>
            <tr>
              <td>Ходьба на носках и пятках (*счет выполняется сначала на носках, потом на пятках)</td>
              {[
                '3 подхода по 10 счетов',
                '3 подхода по 15 счетов',
                '3 подхода по 20 счетов',
                '3 подхода по 25 счетов',
                '3 подхода по 30 счетов'
              ].map((option, idx) => (
                <td key={option} className={`${styles.activityCell} ${styles[`balance-level-${idx + 1}`]}`}>
                  <div
                    className={`${styles.activityCellContent} ${
                      formData['balance_toes_heels_walking'] === option ? styles.selected : ''
                    }`}
                    onClick={() => handleInputChange('balance_toes_heels_walking', option)}
                  >
                    {option}
                  </div>
                </td>
              ))}
            </tr>
            <tr>
              <td>Дополнительное упражнение для 5-го уровня физической активности. Ходьба с изменением направления - вымышленная «восьмерка»</td>
              {[
                '',
                '',
                '',
                '',
                '3 подхода по 2 круга'
              ].map((option, idx) => (
                <td key={option || idx} className={`${styles.activityCell} ${styles[`balance-level-${idx + 1}`]}`}>
                  {option ? (
                    <div
                      className={`${styles.activityCellContent} ${
                        formData['balance_eight_walking'] === option ? styles.selected : ''
                      }`}
                      onClick={() => handleInputChange('balance_eight_walking', option)}
                    >
                      {option}
                    </div>
                  ) : (
                    <div className={`${styles.activityCellContent} disabled`}>-</div>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>

        <div className={styles.activityResult}>
          {formData['balance_level'] > 0 && (
            <p>
              Упражнения на баланс — уровень физической активности{' '}
              {formData['balance_level']}
            </p>
          )}
        </div>

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
            <tr>
              <td>Упражнение на растяжку мышц рук</td>
              {['3x2', '3x3'].map((option, idx) => (
                <td key={option} className={`${styles.activityCell} ${styles[`stretching-level-${idx + 1}`]}`}>
                  <div
                    className={`${styles.activityCellContent} ${
                      formData['stretch_arms'] === option ? styles.selected : ''
                    }`}
                    onClick={() => handleInputChange('stretch_arms', option)}
                  >
                    {option}
                  </div>
                </td>
              ))}
            </tr>
            <tr>
              <td>Упражнение на растяжку мышц плеч (*каждой рукой)</td>
              {['3x2', '3x3'].map((option, idx) => (
                <td key={option} className={`${styles.activityCell} ${styles[`stretching-level-${idx + 1}`]}`}>
                  <div
                    className={`${styles.activityCellContent} ${
                      formData['stretch_shoulders'] === option ? styles.selected : ''
                    }`}
                    onClick={() => handleInputChange('stretch_shoulders', option)}
                  >
                    {option}
                  </div>
                </td>
              ))}
            </tr>
            <tr>
              <td>Для растяжения мышц бедра (*на каждую ногу)</td>
              {['3x2', '3x3'].map((option, idx) => (
                <td key={option} className={`${styles.activityCell} ${styles[`stretching-level-${idx + 1}`]}`}>
                  <div
                    className={`${styles.activityCellContent} ${
                      formData['stretch_thighs'] === option ? styles.selected : ''
                    }`}
                    onClick={() => handleInputChange('stretch_thighs', option)}
                  >
                    {option}
                  </div>
                </td>
              ))}
            </tr>
            <tr>
              <td>Упражнение для растяжения мышц шеи (*в каждую сторону)</td>
              {['3x2', '3x3'].map((option, idx) => (
                <td key={option} className={`${styles.activityCell} ${styles[`stretching-level-${idx + 1}`]}`}>
                  <div
                    className={`${styles.activityCellContent} ${
                      formData['stretch_neck'] === option ? styles.selected : ''
                    }`}
                    onClick={() => handleInputChange('stretch_neck', option)}
                  >
                    {option}
                  </div>
                </td>
              ))}
            </tr>
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
            <tr>
              <td>Упражнения для растяжения мышц голеностопного сустава (*каждой ногой и в каждую сторону)</td>
              {['3x2', '3x3'].map((option, idx) => (
                <td key={option} className={`${styles.activityCell} ${styles[`stretching-level-${idx + 1}`]}`}>
                  <div
                    className={`${styles.activityCellContent} ${
                      formData['stretch_ankle'] === option ? styles.selected : ''
                    }`}
                    onClick={() => handleInputChange('stretch_ankle', option)}
                  >
                    {option}
                  </div>
                </td>
              ))}
            </tr>
            <tr>
              <td>Для растяжения мышц плеча и верхне-задней части грудной клетки</td>
              {['3x2', '3x3'].map((option, idx) => (
                <td key={option} className={`${styles.activityCell} ${styles[`stretching-level-${idx + 1}`]}`}>
                  <div
                    className={`${styles.activityCellContent} ${
                      formData['stretch_shoulder_upper_back'] === option ? styles.selected : ''
                    }`}
                    onClick={() => handleInputChange('stretch_shoulder_upper_back', option)}
                  >
                    {option}
                  </div>
                </td>
              ))}
            </tr>
            <tr>
              <td>Упражнение для растяжки задней части бедра</td>
              {['3x2', '3x3'].map((option, idx) => (
                <td key={option} className={`${styles.activityCell} ${styles[`stretching-level-${idx + 1}`]}`}>
                  <div
                    className={`${styles.activityCellContent} ${
                      formData['stretch_hamstring'] === option ? styles.selected : ''
                    }`}
                    onClick={() => handleInputChange('stretch_hamstring', option)}
                  >
                    {option}
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>

        <div className={styles.activityResult}>
          {formData['stretching_level'] > 0 && (
            <p>
              Упражнения на растяжку — уровень физической активности{' '}
              {formData['stretching_level']}
            </p>
          )}
        </div>
      </div>

            <div className={styles.additionalFields}>
              <div className={styles.fieldGroup}>
                {renderInput('419', 'Положение «стопы вместе»', 'select', ['1 – ≥ 10 с', '2 – < 10 с', '0 – не может выполнить'])}
              </div>
              <div className={styles.fieldGroup}>
                {renderInput('420', 'Полутандемное положение', 'select', ['1 – ≥ 10 с', '2 – < 10 с', '0 – не может выполнить'])}
              </div>
              <div className={styles.fieldGroup}>
                {renderInput('421', 'Тандемное положение', 'select', ['1 – 3,0–9,99 с', '2 – ≥ 10 с', '0 – ≤ 2,99 с / не может'])}
              </div>
              <div className={styles.fieldGroup}>
                {renderInput('422', 'Ходьба на 4 м', 'select', [
                  '1 – ≥ 8,71 с', '2 – 6,21–8,70 с', '3 – 4,82–6,20 с', '4 – ≤ 4,81 с', '0 – не может выполнить'
                ])}
              </div>
              <div className={styles.fieldGroup}>
                {renderInput('423', 'Подъём со стула', 'select', [
                  '1 – ≥ 16,70 с', '2 – 13,70–16,69 с', '3 – 11,20–13,69 с', '4 – ≤ 11,19 с', '0 – не может выполнить'
                ])}
              </div>
              <div className={styles.fieldGroup}>
                {renderInput('424', 'Итоговый балл SPPB', 'number')}
              </div>
              <div className={styles.fieldGroup}>
                {renderInput('434', 'Скорость ходьбы на 4 м (секунды)', 'number')}
              </div>
              <div className={styles.fieldGroup}>
                {renderInput('435', 'Скорость ходьбы на 4 м (м/сек)', 'number')}
              </div>
              <div className={styles.fieldGroup}>
                {renderInput('436', 'Тест «встань и иди» (секунды)', 'number')}
              </div>
            </div>
          </div>
        </details>
      </section>

      <section className="section">
        <details className={styles.details} open={expandedSections['assistiveDevices']} onToggle={() => toggleSection('assistiveDevices')}>
          <summary className="section-title">Использование вспомогательных средств</summary>
          <div className={styles.grid}>
            {renderInput('374', 'Использование вспомогательных средств', 'checkbox', [
              'Очки', 'Съёмные зубные протезы', 'Трость', 'Ортопедическая обувь', 'Ортопедический корсет', 'Абсорбирующее бельё', 'Другое'
            ])}
            {formData['374']?.includes('Другое') && renderInput('374_other', 'Другое вспомогательное средство', 'text')}
          </div>
        </details>
      </section>

      <section className="section">
        <details className={styles.details} open={expandedSections['neuroFunctional']} onToggle={() => toggleSection('neuroFunctional')}>
          <summary className="section-title">Оценка неврологического статуса и функционального состояния</summary>
          <div className={styles.scaleGroup}>
            <div className={styles.scaleSection}>
              <h3 className="subsection-title">Шкала MMSE</h3>
              <div className={styles.grid}>
                {renderInput('551', 'Назовите дату (0–5)', 'number')}
                {renderInput('552', 'Где мы находимся? (0–5)', 'number')}
                {renderInput('553', 'Повторите три слова (0–3)', 'number')}
                {renderInput('554', 'Серийный счёт (0–5)', 'number')}
                {renderInput('555', 'Припомните 3 слова (0–3)', 'number')}
                {renderInput('556', 'Показать ручку и часы (0–2)', 'number')}
                {renderInput('557', 'Повторите предложение (0–1)', 'number')}
                {renderInput('558', 'Выполнение трёхэтапной команды (0–3)', 'number')}
                {renderInput('559', 'Чтение (0–2)', 'number')}
                {renderInput('560', 'Срисуйте рисунок (0–1)', 'number')}
                {renderInput('562', 'MMSE (итоговый балл)', 'number')}
              </div>
            </div>
            <div className={styles.scaleSection}>
              <h3 className="subsection-title">Шкала MOCA</h3>
              <div className={styles.grid}>
                {renderInput('610', 'Создание альтернирующего пути (0–1)', 'number')}
                {renderInput('611', 'Зрительно-конструктивные навыки (0–1)', 'number')}
                {renderInput('612', 'Часы (0–3)', 'number')}
                {renderInput('613', 'Название животных (0–3)', 'number')}
                {renderInput('614', 'Прямой и обратный цифровые ряды (0–2)', 'number')}
                {renderInput('615', 'Ряд букв («А») (0–1)', 'number')}
                {renderInput('616', 'Серийное вычитание (0–3)', 'number')}
                {renderInput('617', 'Повторение фразы (0–2)', 'number')}
                {renderInput('618', 'Беглость речи (0–1)', 'number')}
                {renderInput('619', 'Абстракция (0–2)', 'number')}
                {renderInput('620', 'Отсроченное воспроизведение (0–5)', 'number')}
                {renderInput('621', 'Ориентация (0–6)', 'number')}
                {renderInput('622', 'Добавление балла за образование ≤12 лет (0–1)', 'number')}
                {renderInput('623', 'MOCA (итоговый балл)', 'number')}
              </div>
            </div>
            <div className={styles.scaleSection}>
              <h3 className="subsection-title">Другие показатели</h3>
              <div className={styles.grid}>
                {renderInput('27', 'Индекс Чарлсона', 'number')}
                {renderInput('28', 'Шкала GDS-15', 'number')}
                {renderInput('29', 'Индекс тяжести инсомнии', 'number')}
                {renderInput('107', 'Хроническая боль', 'select', [
                  'Нет, не испытывает', 'Да, постоянно испытывает', 'Да, периодически испытывает'
                ])}
                {formData['107'] !== 'Нет, не испытывает' && (
                  <>
                    {renderInput('108', 'Локализация боли', 'checkbox', [
                      'Поясничный отдел позвоночника', 'Шейный отдел позвоночника', 'Коленные суставы', 'Головная', 'Другое'
                    ])}
                    {formData['108']?.includes('Другое') && (
                      <>
                        {renderInput('109', 'Другая локализация боли?', 'select', ['Да', 'Нет'])}
                        {formData['109'] === 'Да' && renderInput('110', 'Другая локализация боли', 'text')}
                      </>
                    )}
                    {renderInput('111', 'Прием обезболивающих', 'select', [
                      'Не принимает', '<1 раза в неделю', '1-2 раза в неделю', '2-3 раза в неделю', 'Ежедневно'
                    ])}
                    {renderInput('112', 'Число баллов по ВАШ', 'number')}
                  </>
                )}
              </div>
            </div>
            <div className={styles.scaleSection}>
              <h3 className="subsection-title">Оценка качества жизни (EQ-5D)</h3>
              <div className={styles.grid}>
                {renderInput('391', 'Подвижность', 'select', [
                  '0 – Я не испытываю трудностей при ходьбе',
                  '1 – Я испытываю некоторые трудности при ходьбе',
                  '2 – Я прикован(а) к постели'
                ])}
                {renderInput('392', 'Уход за собой', 'select', [
                  '0 – Я не испытываю трудностей при уходе за собой',
                  '1 – Я испытываю некоторые трудности с мытьём или одеванием',
                  '2 – Я не способен(на) самостоятельно мыться или одеваться'
                ])}
                {renderInput('393', 'Повседневная деятельность', 'select', [
                  '0 – Я не испытываю трудностей в моей привычной повседневной деятельности',
                  '1 – Я испытываю некоторые трудности в моей привычной повседневной деятельности',
                  '2 – Я не способен(на) выполнять привычную повседневную деятельность'
                ])}
                {renderInput('394', 'Боль/Дискомфорт', 'select', [
                  '0 – Я не испытываю боли или дискомфорта',
                  '1 – Я испытываю умеренную боль или дискомфорт',
                  '2 – Я испытываю крайне сильную боль или дискомфорт'
                ])}
                {renderInput('395', 'Тревога/Депрессия', 'select', [
                  '0 – Я не испытываю тревоги или депрессии',
                  '1 – Я испытываю умеренную тревогу или депрессию',
                  '2 – Я испытываю крайне сильную тревогу или депрессию'
                ])}
                {renderInput('396', 'Итоговое значение EQ-5D', 'number')}
              </div>
            </div>
            <div className={styles.scaleSection}>
              <h3 className="subsection-title">Шкала Бартел</h3>
              <div className={styles.grid}>
                {renderInput('844', 'Прием пищи', 'select', [
                  '10 – не нуждается в помощи', '5 – нуждается в некоторой помощи', '0 – полностью нуждается'
                ])}
                {renderInput('845', 'Личная гигиена', 'select', ['5 – не нуждается', '3 – небольшая помощь', '0 – полностью нуждается'])}
                {renderInput('846', 'Одевание', 'select', ['10 – не нуждается', '5 – небольшая помощь', '0 – полностью нуждается'])}
                {renderInput('847', 'Прием ванны', 'select', ['5 – без помощи', '2 – с помощью', '0 – полностью нуждается'])}
                {renderInput('848', 'Посещение туалета', 'select', ['10 – не нуждается', '5 – некоторая помощь', '0 – полностью нуждается'])}
                {renderInput('849', 'Контролирование мочеиспускания', 'select', ['10 – полное', '5 – частичная', '0 – полная недержимость'])}
                {renderInput('850', 'Контролирование дефекации', 'select', ['10 – полное', '5 – частичная', '0 – полная недержимость'])}
                {renderInput('851', 'Перемещение с кровати на стул', 'select', [
                  '15 – не нуждается', '10 – наблюдение', '5 – значительная помощь', '0 – не способен'
                ])}
                {renderInput('852', 'Подъем по лестнице', 'select', ['10 – не нуждается', '5 – поддержка', '0 – не способен'])}
                {renderInput('853', 'Мобильность', 'select', [
                  '15 – не нуждается', '10 – вспомогательные средства', '5 – поддержка', '0 – не способен'
                ])}
                {renderInput('854', 'Индекс Бартел (итоговый балл)', 'number')}
              </div>
            </div>
            <div className={styles.scaleSection}>
              <h3 className="subsection-title">Шкала Лоутон</h3>
              <div className={styles.grid}>
                {renderInput('425', 'Телефонные звонки', 'select', ['1 – самостоятельно', '0 – не способен'])}
                {renderInput('426', 'Покупки', 'select', ['1 – самостоятельно', '0 – не способен'])}
                {renderInput('427', 'Приготовление пищи', 'select', ['1 – самостоятельно', '0 – нуждается в помощи'])}
                {renderInput('428', 'Ведение домашнего быта', 'select', ['1 – поддерживает', '0 – только простые дела'])}
                {renderInput('429', 'Стирка', 'select', ['1 – самостоятельно', '0 – не способен'])}
                {renderInput('430', 'Пользование транспортом', 'select', ['1 – самостоятельно', '0 – в сопровождении'])}
                {renderInput('431', 'Прием лекарств', 'select', ['1 – самостоятельно', '0 – с помощью'])}
                {renderInput('432', 'Финансовые операции', 'select', ['1 – самостоятельно', '0 – нуждается в помощи'])}
                {renderInput('433', 'Индекс Лоутон (итоговый балл)', 'number')}
              </div>
            </div>
          </div>
        </details>
      </section>

      <section className="section">
        <details className={styles.details} open={expandedSections['labResults']} onToggle={() => toggleSection('labResults')}>
          <summary className="section-title">Результаты лабораторных исследований</summary>
          <div className={styles.grid}>
            {renderInput('67', 'Гемоглобин (г/л)', 'number')}
            {renderInput('68', 'Эритроциты (10¹²/л)', 'number')}
            {renderInput('69', 'Лейкоциты (10⁹/л)', 'number')}
            {renderInput('70', 'Лимфоциты absolute (10⁹/л)', 'number')}
            {renderInput('71', 'Тромбоциты (10⁹/л)', 'number')}
            {renderInput('72', 'СОЭ (мм/час)', 'number')}
            {renderInput('73', 'Общий белок (г/л)', 'number')}
            {renderInput('74', 'Альбумин (г/л)', 'number')}
            {renderInput('75', 'Креатинин (мкмоль/л)', 'number')}
            {renderInput('76', 'СКФ (мл/мин/1.73 м²)', 'number')}
            {renderInput('77', 'Гликированный гемоглобин (%)', 'number')}
            {renderInput('78', 'Глюкоза (ммоль/л)', 'number')}
            {renderInput('79', 'АСТ (ЕД/л)', 'number')}
            {renderInput('80', 'АЛТ (ЕД/л)', 'number')}
            {renderInput('81', 'Билирубин общий (мкмоль/л)', 'number')}
            {renderInput('82', 'Мочевая кислота (мкмоль/л)', 'number')}
            {renderInput('83', 'Холестерин общий (ммоль/л)', 'number')}
            {renderInput('84', 'ЛПНП (ммоль/л)', 'number')}
            {renderInput('85', 'ЛПВП (ммоль/л)', 'number')}
            {renderInput('86', 'Триглицериды (ммоль/л)', 'number')}
            {renderInput('87', 'Ca ионизированный (ммоль/л)', 'number')}
            {renderInput('88', 'Ca общий (ммоль/л)', 'number')}
            {renderInput('89', 'СРБ (мг/л)', 'number')}
            {renderInput('90', 'Сывороточное железо (мкмоль/л)', 'number')}
            {renderInput('91', 'Ферритин (нг/мл)', 'number')}
            {renderInput('92', 'Витамин 25(OH) D (нг/мл)', 'number')}
            {renderInput('93', 'ТТГ (мкМЕ/мл)', 'number')}
            {renderInput('94', 'Витамин B12 (пг/мл)', 'number')}
            {renderInput('95', 'Фолиевая кислота (нг/мл)', 'number')}
          </div>
        </details>
      </section>

      <section className="section">
        <details className={styles.details} open={expandedSections['mna']} onToggle={() => toggleSection('mna')}>
          <summary className="section-title">Скрининг на мальнутрицию (MNA)</summary>
          <div className={styles.grid}>
            {renderInput('397', 'Снижение количества пищи', 'select', [
              '2 – нет снижения', '1 – умеренное снижение', '0 – значительное снижение'
            ])}
            {renderInput('398', 'Потеря массы тела', 'select', [
              '3 – нет потери', '1 – более 3 кг', '2 – 1-3 кг'
            ])}
            {renderInput('399', 'Подвижность', 'select', [
              '2 – выходит из дома', '1 – не выходит', '0 – требуется помощь'
            ])}
            {renderInput('400', 'Острое заболевание (стресс)', 'select', ['2 – нет', '0 – да'])}
            {renderInput('401', 'Психоневрологические проблемы', 'select', [
              '2 – нет', '1 – умеренное нарушение памяти', '0 – выраженные проблемы'
            ])}
            {renderInput('402', 'Индекс массы тела', 'select', [
              '3 – ИМТ ≥ 23', '2 – ИМТ 21–22,9', '1 – ИМТ 19–20,9', '0 – ИМТ < 19'
            ])}
            {renderInput('403', 'Живет независимо', 'select', ['1 – да', '0 – нет'])}
            {renderInput('404', 'Принимает более 3 лекарств в день', 'select', ['0 – да', '1 – нет'])}
            {renderInput('405', 'Пролежни или кожные язвы', 'select', ['0 – да', '1 – нет'])}
            {renderInput('406', 'Количество полноценных приемов пищи', 'select', [
              '0 – 1 прием пищи', '1 – 2 приема пищи', '2 – 3 приема пищи'
            ])}
            {renderInput('407', 'Маркеры потребления белка', 'select', [
              '0 – 0 или 1 да', '1 – 2 да', '2 – 3 да'
            ])}
            {renderInput('408', 'Потребление фруктов и овощей', 'select', ['1 – да', '0 – нет'])}
            {renderInput('409', 'Снижение потребления жидкости', 'select', [
              '0 – менее 3 стаканов', '1 – 3-5 стаканов', '2 – более 5 стаканов'
            ])}
            {renderInput('410', 'Способность к питанию', 'select', [
              '0 – неспособен питаться без помощи', '1 – питается с трудом', '2 – питается без проблем'
            ])}
            {renderInput('411', 'Самооценка состояния питания', 'select', [
              '0 – считает, что недоедает', '1 – не уверен в своем питании', '2 – считает, что питается нормально'
            ])}
            {renderInput('412', 'Самооценка здоровья по сравнению с другими', 'select', [
              '0 – хуже', '0.5 – не знает', '1 – так же', '2 – лучше'
            ])}
            {renderInput('413', 'Окружность середины плеча (см)', 'select', [
              '0 – менее 21', '0.5 – 21-22', '1 – более 22'
            ])}
            {renderInput('414', 'Окружность голени (см)', 'select', ['0 – менее 31', '1 – 31 и более'])}
            {renderInput('415', 'MNA (итоговый балл)', 'number')}
          </div>
        </details>
      </section>
    </div>
  );
}

export default CreateCard;