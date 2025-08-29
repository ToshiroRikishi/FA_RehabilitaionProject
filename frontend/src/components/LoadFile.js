// frontend/src/components/LoadFile.js

import React, { useState } from 'react';
import styles from './LoadFile.module.css';

const validationMap = {
  'ВОЗРАСТ_НЕ_ПОМЕХА_количество_баллов_(СКРИНИНГ_«ВОЗРАСТ_НЕ_ПОМЕХА»)': { min: 0, max: 7, type: 'integer' },
  'Физическая_активность_-_кратность_(Факторы_риска_хронических_неинфекционных_заболеваний)': { type: 'string', isCategorical: true },
  'Физическая_активность_-_продолжительность_(Факторы_риска_хронических_неинфекционных_заболеваний)': { type: 'string', isCategorical: true },
  'ИМТ_(кг/м^2)_(Осмотр)': { type: 'float', decimalPlaces: 2 },
  'индекс_Бартел_количество_баллов_(Шкала_базовой_активности_в_повседневной_жизни_(индекс_Бартел)_-ADL)': { min: 0, max: 100, type: 'integer' },
  'SPPB_количество_баллов_(Краткая_батарея_тестов_физического_функционирования_(SPPB))': { min: 0, max: 12, type: 'integer' },
  'Тест_«встань_и_иди»_(сек)_(≤10_–_норма;_≥14_-_риск_падений):_(Тест_«встань_и_иди»)': { type: 'float', decimalPlaces: 2 },
  'Ходьба_на_4_м_(Время__секунды)_(Краткая_батарея_тестов_физического_функционирования_(SPPB))': { min: 0, max: 4, type: 'integer' },
  'Уровень_(Стратификация_по_уровню_физической_активности)': { min: 1, max: 5, type: 'integer' }
};

const col58Options = ['<1 раза в месяц', '<1 раза в неделю', '1 раз в неделю', '2-3 раза в неделю', 'Ежедневно'];
const col59Options = ['<30 мин', '30-60 мин', '1-4 часа', '>4 часов'];

const LoadFile = () => {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [newPatients, setNewPatients] = useState([]);
  const [isTableOpen, setIsTableOpen] = useState(false);
  const [editingPatientIndex, setEditingPatientIndex] = useState(-1);
  const [manualInputs, setManualInputs] = useState({});

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
      }
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
      }
    }
  };

  const validateFile = (file) => {
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    
    if (!allowedExtensions.includes(fileExtension)) {
      alert('Пожалуйста, выберите файл Excel (.xlsx или .xls)');
      return false;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      alert('Размер файла не должен превышать 10MB');
      return false;
    }
    
    return true;
  };

  const checkNewPatients = async () => {
    if (!file) {
      alert('Пожалуйста, выберите файл');
      return;
    }

    setLoading(true);
    setResult(null);
    setShowConfirmation(false);
    setNewPatients([]);
    setIsTableOpen(false);
    setEditingPatientIndex(-1);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/api/check-new-patients', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Ошибка при проверке файла');
      }

      const data = await response.json();

      setResult(data);
      if (data.status === 'new_patients_found') {
        setNewPatients(data.new_patients);
        setShowConfirmation(true);
      }

    } catch (error) {
      console.error('Error:', error);
      alert(`Ошибка: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fillSynthetic = async (patientIndex) => {
    setLoading(true);

    try {
      const patient = newPatients[patientIndex];
      const response = await fetch('http://localhost:8000/api/fill-synthetic-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: patient.data }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Ошибка при заполнении синтетикой');
      }

      const data = await response.json();
      const updatedPatients = [...newPatients];
      updatedPatients[patientIndex].data = data.data;
      updatedPatients[patientIndex].missing_columns = [];
      setNewPatients(updatedPatients);

    } catch (error) {
      console.error('Error:', error);
      alert(`Ошибка: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fillAllSynthetic = async () => {
    setLoading(true);
    try {
      const promises = newPatients.map((patient, index) => {
        if (patient.missing_columns.length > 0) {
          return fillSynthetic(index);
        }
        return Promise.resolve();
      });
      await Promise.all(promises);
    } catch (error) {
      alert(`Ошибка при заполнении всех: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const startManualEdit = (index) => {
    setEditingPatientIndex(index);
    const inputs = {};
    newPatients[index].missing_columns.forEach(col => {
      inputs[col] = '';
    });
    setManualInputs(inputs);
  };

  const handleInputChange = (col, value) => {
    setManualInputs(prev => ({ ...prev, [col]: value }));
  };

  const validateInput = (col, value) => {
    const rules = validationMap[col];
    if (!rules) return true;
  
    // Для категориальных значений (col_58 и col_59) проверяем только вхождение в список опций
    if (rules.isCategorical) {
      let options = col.includes('кратность') ? col58Options : col59Options;
      return options.includes(value);
    }
  
    // Для остальных значений проверяем как числовые
    let numValue = parseFloat(value);
  
    if (rules.type === 'integer') {
      if (!Number.isInteger(numValue)) return false;
    } else if (rules.type === 'float') {
      if (isNaN(numValue)) return false;
      if (rules.decimalPlaces) {
        const decimalPart = value.toString().split('.')[1];
        if (decimalPart && decimalPart.length > rules.decimalPlaces) return false;
      }
    }
  
    if (rules.min !== undefined && numValue < rules.min) return false;
    if (rules.max !== undefined && numValue > rules.max) return false;
  
    return true;
  };

  const saveManualInputs = (index) => {
    const updatedPatients = [...newPatients];
    const patient = updatedPatients[index];
    const newMissing = [];

    Object.keys(manualInputs).forEach(col => {
      const value = manualInputs[col];
      if (value && validateInput(col, value)) {
        patient.data[col] = value;
      } else {
        newMissing.push(col);
        if (value) alert(`Неверное значение для ${col}`);
      }
    });

    patient.missing_columns = newMissing;
    setNewPatients(updatedPatients);
    setEditingPatientIndex(-1);
    setManualInputs({});
  };

  const uploadPatients = async () => {
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/upload-new-patients-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPatients),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Ошибка при загрузке пациентов');
      }

      alert(`Успешно! ${data.message}`);
      resetForm();

    } catch (error) {
      console.error('Error:', error);
      alert(`Ошибка: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setResult(null);
    setShowConfirmation(false);
    setNewPatients([]);
    setIsTableOpen(false);
    setEditingPatientIndex(-1);
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleCancel = () => {
    resetForm();
  };

  const hasMissing = newPatients.some(p => p.missing_columns.length > 0);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Загрузка пациентов с помощью файла</h1>
      </div>

      <div className={styles.uploadSection}>
        <div className={styles.imageContainer}>
          <img 
            src="/images/logo_load_file.png" 
            alt="Загрузка пациентов" 
            className={styles.mainImage}
          />
        </div>

        <div
          className={`${styles.dropZone} ${dragActive ? styles.dragActive : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => document.getElementById('fileInput').click()}
        >
          <input
            id="fileInput"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          
          {file ? (
            <div className={styles.fileInfo}>
              <div className={styles.fileName}>{file.name}</div>
              <div className={styles.fileSize}>
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
          ) : (
            <div className={styles.dropText}>
              <div className={styles.uploadIcon}>📄</div>
              <p>Перетащите файл Excel сюда или нажмите для выбора</p>
              <small>Поддерживаемые форматы: .xlsx, .xls</small>
            </div>
          )}
        </div>

        <button
          className={styles.uploadButton}
          onClick={checkNewPatients}
          disabled={!file || loading}
        >
          {loading ? 'Проверка...' : 'Проверить файл'}
        </button>
      </div>

      {result && (
        <div className={styles.resultSection}>
          {result.status === 'no_new_patients' ? (
            <div className={styles.noNewPatients}>
              <h3>Новых пациентов не найдено</h3>
              <p>Все пациенты из файла уже существуют в базе данных.</p>
            </div>
          ) : result.status === 'new_patients_found' && showConfirmation ? (
            <div className={styles.newPatientsFound}>
              <h3 onClick={() => setIsTableOpen(!isTableOpen)} style={{cursor: 'pointer'}}>
                Обнаружены новые пациенты {isTableOpen ? '▼' : '▶'}
              </h3>
              
              {isTableOpen && (
                <>
                  {hasMissing && (
                    <button
                      className={styles.fillAllButton}
                      onClick={fillAllSynthetic}
                      disabled={loading}
                    >
                      Быстрое заполнение всех пропусков данных
                    </button>
                  )}
                  <div className={styles.patientsTable}>
                    <table>
                      <thead>
                        <tr>
                          <th>№</th>
                          <th>Код карты пациента</th>
                          <th>Пропуски в столбцах</th>
                          <th>Действие</th>
                        </tr>
                      </thead>
                      <tbody>
                        {newPatients.map((patient, index) => (
                          <tr key={index}>
                            <td>{index + 1}</td>
                            <td>{patient.code}</td>
                            <td>
                              {editingPatientIndex === index ? (
                                <div className={styles.editingDiv}>
                                  {patient.missing_columns.map(col => (
                                    <div key={col} className={styles.inputGroup}>
                                      <label>{col}</label>
                                      {validationMap[col]?.isCategorical ? (
                                        <select
                                          value={manualInputs[col] || ''}
                                          onChange={(e) => handleInputChange(col, e.target.value)}
                                        >
                                          <option value="">Выберите</option>
                                          {(col.includes('кратность') ? col58Options : col59Options).map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                          ))}
                                        </select>
                                      ) : (
                                        <input
                                          type="text"
                                          value={manualInputs[col] || ''}
                                          onChange={(e) => handleInputChange(col, e.target.value)}
                                        />
                                      )}
                                    </div>
                                  ))}
                                  <button className={styles.saveButton} onClick={() => saveManualInputs(index)}>Сохранить</button>
                                  <button className={styles.cancelEditButton} onClick={() => setEditingPatientIndex(-1)}>Отмена</button>
                                </div>
                              ) : patient.missing_columns.length > 0 ? (
                                <ul className={styles.missingList}>
                                  {patient.missing_columns.map((col, i) => (
                                    <li key={i}>{col}</li>
                                  ))}
                                </ul>
                              ) : 'Нет пропусков'}
                            </td>
                            <td>
                              {patient.missing_columns.length > 0 && (
                                <div className={styles.actionButtons}>
                                  <button
                                    className={styles.fillButton}
                                    onClick={() => fillSynthetic(index)}
                                    disabled={loading}
                                  >
                                    Заполнить синтетикой
                                  </button>
                                  <button
                                    className={styles.manualButton}
                                    onClick={() => startManualEdit(index)}
                                    disabled={loading}
                                  >
                                    Ввести вручную
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <div className={styles.confirmation}>
                <p className={styles.confirmationText}>Загрузить всех в базу?</p>
                <div className={styles.confirmationButtons}>
                  <button
                    className={styles.confirmButton}
                    onClick={uploadPatients}
                    disabled={loading}
                  >
                    {loading ? 'Загрузка...' : 'Да'}
                  </button>
                  <button
                    className={styles.cancelButton}
                    onClick={handleCancel}
                    disabled={loading}
                  >
                    Нет
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default LoadFile;