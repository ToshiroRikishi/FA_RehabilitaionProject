// frontend/src/components/PatientProgram.js

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import styles from './PatientProgram.module.css';

const PatientProgram = () => {
  const { patientCode } = useParams();
  const [programData, setProgramData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPatientProgram = async () => {
      if (!patientCode) return;
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`http://localhost:8000/patient-program/${patientCode}`);
        if (!response.ok) {
          throw new Error('Не удалось загрузить программу реабилитации');
        }
        const data = await response.json();
        setProgramData(data);
      } catch (err) {
        setError(err.message);
        setProgramData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPatientProgram();
  }, [patientCode]);

  if (loading) {
    return <div className={styles.loading}>Загрузка программы реабилитации...</div>;
  }

  if (error) {
    return <div className={styles.error}>Ошибка: {error}</div>;
  }

  if (!programData) {
    return <div className={styles.noData}>Нет данных о программе реабилитации</div>;
  }

  const { patient_info, rehabilitation_program } = programData;

  return (
    <div className={styles.container}>
      <h1>Индивидуальная программа реабилитации</h1>
      
      <div className={styles.patientInfo}>
        <h2>Информация о пациенте</h2>
        <p><strong>Код карты:</strong> {patient_info.code}</p>
        <p><strong>Пол:</strong> {patient_info.gender}</p>
        <p><strong>Возраст:</strong> {patient_info.age}</p>
        <p><strong>Скрининговый номер:</strong> {patient_info.screening_number}</p>
        <p><strong>Статус:</strong> {patient_info.status}</p>
        <p><strong>Группа:</strong> {patient_info.group}</p>
      </div>

      <div className={styles.program}>
        <h2>Рекомендации по реабилитации</h2>
        
        {rehabilitation_program.vaccination && rehabilitation_program.vaccination.length > 0 && (
          <ProgramSection title="Вакцинация" items={rehabilitation_program.vaccination} />
        )}
        
        {rehabilitation_program.swallowing_issues && rehabilitation_program.swallowing_issues.length > 0 && (
          <ProgramSection title="Нарушения глотания" items={rehabilitation_program.swallowing_issues} />
        )}
        
        {rehabilitation_program.assistive_devices && rehabilitation_program.assistive_devices.length > 0 && (
          <ProgramSection title="Вспомогательные средства" items={rehabilitation_program.assistive_devices} />
        )}
        
        {rehabilitation_program.mobility && rehabilitation_program.mobility.length > 0 && (
          <ProgramSection title="Мобильность" items={rehabilitation_program.mobility} />
        )}
        
        {rehabilitation_program.mental_health && rehabilitation_program.mental_health.length > 0 && (
          <ProgramSection title="Психическое здоровье" items={rehabilitation_program.mental_health} />
        )}
        
        {rehabilitation_program.sleep && rehabilitation_program.sleep.length > 0 && (
          <ProgramSection title="Сон" items={rehabilitation_program.sleep} />
        )}
        
        {rehabilitation_program.osteoporosis && rehabilitation_program.osteoporosis.length > 0 && (
          <ProgramSection title="Остеопороз" items={rehabilitation_program.osteoporosis} />
        )}
        
        {rehabilitation_program.physical_activity && rehabilitation_program.physical_activity.length > 0 && (
          <ProgramSection title="Физическая активность" items={rehabilitation_program.physical_activity} />
        )}
        
        {rehabilitation_program.social_support && rehabilitation_program.social_support.length > 0 && (
          <ProgramSection title="Социальная поддержка" items={rehabilitation_program.social_support} />
        )}
        
        {rehabilitation_program.lifestyle_modification && rehabilitation_program.lifestyle_modification.length > 0 && (
          <ProgramSection title="Модификация образа жизни" items={rehabilitation_program.lifestyle_modification} />
        )}
        
        {rehabilitation_program.nutrition && rehabilitation_program.nutrition.length > 0 && (
          <ProgramSection title="Питание" items={rehabilitation_program.nutrition} />
        )}
        
        {rehabilitation_program.additional_recommendations && rehabilitation_program.additional_recommendations.length > 0 && (
          <ProgramSection title="Дополнительные рекомендации" items={rehabilitation_program.additional_recommendations} />
        )}
      </div>
    </div>
  );
};

// Компонент для отображения секции программы
const ProgramSection = ({ title, items }) => (
  <div className={styles.section}>
    <h3>{title}</h3>
    <ul>
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  </div>
);

export default PatientProgram;