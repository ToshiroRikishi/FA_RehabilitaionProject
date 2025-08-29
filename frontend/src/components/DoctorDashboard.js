/* frontend/src/components/DoctorDashboard.js*/

import React, { useState, useEffect, useCallback } from "react";
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import styles from './DoctorDashboard.module.css';
import { useNavigate } from 'react-router-dom';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function DoctorDashboard() {
  const [patients, setPatients] = useState([]);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictMessage, setPredictMessage] = useState(null);

  const handleNavigateToProgram = useCallback((patientCode) => {
    console.log(`Переход к созданию программы для пациента с кодом: ${patientCode}`);
    navigate(`/patient-program/${patientCode}`);
  }, [navigate]);

  const handleNavigateToCard = useCallback((patientCode) => {
    console.log(`Переход к карте реабилитации пациента с кодом: ${patientCode}`);
    navigate(`/patient-card/${patientCode}`);
  }, [navigate]);

  const handleNavigateToLevelFA = useCallback(() => {
    console.log('Переход к быстрой оценке физической активности');
    navigate('/level-fa');
  }, [navigate]);

  const [chartData, setChartData] = useState({
    labels: ['1', '2', '3', '4', '5'],
    datasets: [],
  });

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://127.0.0.1:8000/patients');
      if (!response.ok) {
        throw new Error(`Ошибка HTTP: ${response.status}`);
      }
      const data = await response.json();
      setPatients(data);
    } catch (e) {
      console.error("Ошибка при загрузке данных пациентов:", e);
      setError("Не удалось загрузить данные пациентов.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  useEffect(() => {
    if (patients.length > 0) {
      const levelCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      const levelRegex = /\((\d)\s*ур\.\)/;

      patients.forEach(patient => {
        const infoParts = patient.patient_info.split(',').map(part => part.trim());
        const activityStr = infoParts.length > 1 ? infoParts[1] : null;

        if (activityStr) {
          const match = activityStr.match(levelRegex);
          if (match && match[1]) {
            const level = parseInt(match[1], 10);
            if (level >= 1 && level <= 5) {
              levelCounts[level]++;
            }
          }
        }
      });

      setChartData({
        labels: ['1', '2', '3', '4', '5'],
        datasets: [
          {
            label: 'Количество пациентов',
            data: Object.values(levelCounts),
            backgroundColor: [
              'rgba(173, 216, 230, 0.7)',
              'rgba(135, 206, 250, 0.7)',
              'rgba(100, 149, 237, 0.7)',
              'rgba(70, 130, 180, 0.7)',
              'rgba(65, 105, 225, 0.7)',
            ],
            borderColor: [
              'rgba(173, 216, 230, 1)',
              'rgba(135, 206, 250, 1)',
              'rgba(100, 149, 237, 1)',
              'rgba(70, 130, 180, 1)',
              'rgba(65, 105, 225, 1)',
            ],
            borderWidth: 1,
          },
        ],
      });
    } else {
      setChartData({
        labels: ['1', '2', '3', '4', '5'],
        datasets: [{
          label: 'Количество пациентов',
          data: [0, 0, 0, 0, 0],
          backgroundColor: 'rgba(173, 216, 230, 0.7)',
          borderColor: 'rgba(173, 216, 230, 1)',
          borderWidth: 1,
        }],
      });
    }
  }, [patients]);

  const handlePredictActivity = async () => {
    setIsPredicting(true);
    setPredictMessage(null);
    setError(null);
    try {
      const response = await fetch('http://127.0.0.1:8000/predict-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.detail || `Ошибка сервера: ${response.status}`);
      }
      setPredictMessage(`${result.message} Обновлено записей: ${result.updated_count}.`);
      await fetchPatients();
    } catch (e) {
      console.error("Ошибка при вызове предсказания:", e);
      setPredictMessage(`Ошибка: ${e.message || "Не удалось выполнить оценку."}`);
    } finally {
      setIsPredicting(false);
    }
  };

  const renderPatientRows = () => {
    if (loading && !isPredicting) {
      return <tr><td colSpan="5" className="loading">Загрузка данных...</td></tr>;
    }
    if (error && !predictMessage) {
      return <tr><td colSpan="5" className="error">{error}</td></tr>;
    }
    if (!loading && patients.length === 0 && !error) {
      return <tr><td colSpan="5">Наблюдаемые пациенты отсутствуют.</td></tr>;
    }
    return patients.map(patient => {
      const infoParts = patient.patient_info.split(',').map(part => part.trim());
      const [gender, activityLevel] = infoParts;
      return (
        <tr key={patient.code}>
          <td>{patient.code}</td>
          <td>{gender || 'Н/Д'}</td>
          <td>{(activityLevel && activityLevel !== 'None' && activityLevel !== 'Не оценено') ? activityLevel : '-'}</td>
          <td className={styles.actionsCell}>
            <div className={styles.actionsContainer}>
              <button
                onClick={() => handleNavigateToCard(patient.code)}
                className={styles.cardButton}
              >
                Карта реабилитации
              </button>
              <button
                onClick={() => handleNavigateToProgram(patient.code)}
                className={styles.rehabButton}
              >
                Составить программу реабилитации
              </button>
            </div>
          </td>
        </tr>
      );
    });
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: 'Распределение пациентов по уровню физической активности',
        font: { size: 16 }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            if (context.parsed.y !== null) {
              const count = context.parsed.y;
              label += `${count} ${count === 1 ? 'пациент' : (count > 1 && count < 5 ? 'пациента' : 'пациентов')}`;
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Количество пациентов' },
        ticks: { stepSize: 1, precision: 0 }
      },
      x: { title: { display: true, text: 'Уровень физической активности' } }
    }
  };

  return (
    <div className={styles.doctorDashboardContainer}>
      <header className={styles.doctorHeader}>
        <div className={styles.headerContent}>
          <h3 className="section-title">Наименование лечебного заведения</h3>
          <div className={styles.headerLayout}>
            <div className={styles.doctorInfoBlock}>
              <div className={styles.doctorInfoCard}>
                <h4 className={styles.doctorTitle}>Доктор</h4>
                <div className={styles.doctorMainInfo}>
                  <div className={styles.doctorInfoField}>
                    <label>Фамилия:</label>
                    <input type="text" placeholder="Введите фамилию" />
                  </div>
                  <div className={styles.doctorInfoField}>
                    <label>Имя:</label>
                    <input type="text" placeholder="Введите имя" />
                  </div>
                  <div className={styles.doctorInfoField}>
                    <label>Отчество:</label>
                    <input type="text" placeholder="Введите отчество" />
                  </div>
                  <div className={styles.doctorInfoField}>
                    <label>Специализация:</label>
                    <input type="text" placeholder="Введите специализацию" />
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.doctorAvatarBlock}>
              <div className={styles.doctorAvatar}>
                <img src="/images/prof_in_app_4.png" alt="Doctor Avatar" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className={styles.patientsChartSection}>
      <div className="flex flex-column mb-4">
        <h3 className="section-title" style={{ marginBottom: '20px' }}>
          Наблюдаемые пациенты
        </h3>
        <div className={styles.topButtonsContainer}>
          <button
            onClick={handlePredictActivity}
            disabled={isPredicting || loading}
            className={styles.predictButtonCustom}
          >
            {isPredicting ? 'Оценка...' : 'Оценить уровень ФА'}
          </button>
          <button
            onClick={handleNavigateToLevelFA}
            disabled={isPredicting || loading}
            className={styles.quickFaButton}
          >
            Быстрая оценка физической активности
          </button>
        </div>
        {predictMessage && (
          <div className="text-center mt-2">
            <span className={predictMessage.startsWith('Ошибка') ? 'error' : 'success'}>
              {predictMessage}
            </span>
          </div>
        )}
      </div>
        
        <div className={styles.chartContainer}>
          {!loading && chartData.datasets.length > 0 ? (
            <Bar options={chartOptions} data={chartData} />
          ) : loading ? (
            <p className="loading">Загрузка графика...</p>
          ) : (
            <p className="info">Нет данных для отображения графика.</p>
          )}
        </div>
        
        <div className={styles.patientsList}>
          <table className="table">
            <thead>
              <tr>
                <th>Код пациента</th>
                <th>Пол</th>
                <th>Физ. активность</th>
                <th className={styles.actionsHeader}>Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="5" style={{ padding: '0' }}>
                  <button
                    onClick={() => navigate('/create-card')}
                    className={styles.addCardButton}
                  >
                    <span className={styles.addCardIcon}>+</span>
                    Добавить карту реабилитации для пациента
                  </button>
                  <button
                    onClick={() => navigate('/load-file')}
                    className={styles.addCardButton}
                  >
                    <span className={styles.addCardIcon}>+</span>
                    Добавить пациентов с помощью загрузки файла
                  </button>
                </td>
              </tr>
              {renderPatientRows()}
              {isPredicting && (
                <tr>
                  <td colSpan="5" className="text-center loading" style={{ fontStyle: 'italic' }}>
                    Выполняется оценка уровня ФА...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default DoctorDashboard;