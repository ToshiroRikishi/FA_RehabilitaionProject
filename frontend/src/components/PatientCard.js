// frontend/src/components/PatientCard.js

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import styles from './PatientCard.module.css';

const PatientCard = () => {
  const { patientCode } = useParams();
  const [patientData, setPatientData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPatientData = async () => {
      if (!patientCode) return;
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`http://localhost:8000/patient-card/${patientCode}`);
        if (!response.ok) {
          throw new Error('Пациент не найден');
        }
        const data = await response.json();
        setPatientData(data);
      } catch (err) {
        setError(err.message);
        setPatientData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPatientData();
  }, [patientCode]);

  if (loading) {
    return <div className={styles.loading}>Загрузка данных пациента...</div>;
  }

  if (error) {
    return <div className={styles.error}>Ошибка: {error}</div>;
  }

  if (!patientData) {
    return <div className={styles.noData}>Нет данных о пациенте</div>;
  }

  return (
    <div className={styles.container}>
      <h1>Карта пациента №{patientCode}</h1>
      
      {/* Обобщенная оценка по шкалам */}
      {patientData.scale_interpretations && (
        <div className={styles.interpretationSection}>
          <h2>Обобщенная оценка по шкалам</h2>
          <table className={styles.interpretationTable}>
            <thead>
              <tr>
                <th>Шкала</th>
                <th>Баллы</th>
                <th>Интерпретация</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(patientData.scale_interpretations).map(([scaleName, scaleData]) => (
                <tr key={scaleName}>
                  <td className={styles.scaleName}>{scaleName}</td>
                  <td className={styles.scaleScore}>{scaleData.score !== null && scaleData.score !== undefined ? scaleData.score : 'Н/Д'}</td>
                  <td className={styles.scaleInterpretation}>{scaleData.interpretation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Остальные секции с данными пациента */}
      <div className={styles.patientData}>
        <Section title="Общая информация" data={patientData.general_info} />
        <Section title="Шкала 'Возраст не помеха'" data={patientData.age_not_obstacle} />
        <Section title="Социальный анамнез" data={patientData.social_history} />
        <Section title="Эпидемиологический анамнез" data={patientData.epidemiological_history} />
        <Section title="Хронические заболевания" data={patientData.chronic_diseases} />
        <Section title="Хроническая боль" data={patientData.chronic_pain} />
        <Section title="Госпитализация" data={patientData.hospitalization} />
        <Section title="Факторы риска хронических неинфекционных заболеваний" data={patientData.risk_factors} />
        <Section title="Использование вспомогательных средств" data={patientData.assistive_devices} />
        <Section title="Падения и переломы, денситометрия" data={patientData.falls_fractures_densitometry} />
        <Section title="Осмотр" data={patientData.examination} />
        <Section title="Результаты лабораторных исследований" data={patientData.lab_results} />
        <Section title="Результаты инструментальных исследований" data={patientData.instrumental_results} />
        <Section title="Лекарственная терапия" data={patientData.drug_therapy} />
        <Section title="Клиническая шкала старческой астении" data={patientData.clinical_frailty_scale} />
        <Section title="Шкала Бартел (ADL)" data={patientData.barthel_scale} />
        <Section title="Шкала Лоутон (IADL)" data={patientData.lawton_scale} />
        <Section title="Краткая батарея тестов физического функционирования (SPPB)" data={patientData.sppb_scale} />
        <Section title="Тест 'Встань и иди'" data={patientData.get_up_and_go_test} />
        <Section title="Двухминутный тест с ходьбой" data={patientData.two_minute_walk_test} />
        <Section title="Стратификация по уровню физической активности" data={patientData.physical_activity_level} />
        <Section title="Динамометрия" data={patientData.dynamometry} />
        <Section title="Краткая шкала оценки питания (MNA)" data={patientData.mna_scale} />
        <Section title="Краткая шкала оценки психического статуса (MMSE)" data={patientData.mmse_scale} />
        <Section title="Шкала MOCA" data={patientData.moca_scale} />
        <Section title="Оценка качества жизни (EQ-5D)" data={patientData.eq5d_scale} />
        <Section title="Состояние на сегодняшний день" data={patientData.today_status} />
        <Section title="Оценка гериатрического индекса здоровья" data={patientData.geriatric_health_index} />
        <Section title="Медицинские условия" data={patientData.medical_conditions} />
      </div>
    </div>
  );
};

// Компонент для отображения секции с данными
const Section = ({ title, data }) => (
  <div className={styles.section}>
    <h2>{title}</h2>
    <table className={styles.table}>
      <tbody>
        {Object.entries(data).map(([key, value]) => (
          <tr key={key}>
            <td className={styles.key}>{key}</td>
            <td className={styles.value}>{value !== null && value !== undefined ? value.toString() : 'Нет данных'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default PatientCard;