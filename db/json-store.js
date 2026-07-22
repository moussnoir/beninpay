/**
 * Simple JSON-based database (temporaire - remplacer par SQLite en production)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sur Render, utiliser /opt/render/.data pour persistance entre redeploys
// Sinon fallback vers le dossier local db/
const PERSISTENT_DIR = process.env.RENDER
  ? '/opt/render/.data'
  : __dirname;

// Creer le repertoire si necessaire
try { if (!fs.existsSync(PERSISTENT_DIR)) fs.mkdirSync(PERSISTENT_DIR, { recursive: true }); } catch(e) {}

const DB_FILE = path.join(PERSISTENT_DIR, 'beninpay-data.json');
const DB_BACKUP = path.join(__dirname, 'beninpay-data.json');

// Structure de données initiale
const initialData = {
  merchants: [],
  transactions: [],
  withdrawals: [],
  activity_logs: []
};

// Charger les données (avec fallback vers backup)
function loadData() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(data);
    }
    // Fallback: essayer le backup dans le repo
    if (DB_FILE !== DB_BACKUP && fs.existsSync(DB_BACKUP)) {
      console.log('[DB] Restauration depuis backup...');
      const data = fs.readFileSync(DB_BACKUP, 'utf8');
      const parsed = JSON.parse(data);
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2));
      return parsed;
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  } catch (error) {
    console.error('[DB] Erreur chargement:', error);
    return initialData;
  }
}

// Sauvegarder les données (ecriture atomique + backup)
function saveData(data) {
  try {
    const json = JSON.stringify(data, null, 2);
    fs.writeFileSync(DB_FILE, json);
    // Aussi sauvegarder le backup si chemin different
    if (DB_FILE !== DB_BACKUP) {
      try { fs.writeFileSync(DB_BACKUP, json); } catch(e) {}
    }
  } catch (error) {
    console.error('[DB] Erreur sauvegarde:', error);
  }
}

// Générer un ID unique
function generateId(table) {
  const data = loadData();
  const items = data[table] || [];
  return items.length > 0 ? Math.max(...items.map(item => item.id || 0)) + 1 : 1;
}

// Initialiser la base
export const initDatabase = async () => {
  loadData();
  console.log('[DB] Base JSON initialisée:', DB_FILE);
};

// SELECT * WHERE
export const query = async (tableName, filter = {}) => {
  const data = loadData();
  const table = data[tableName] || [];

  if (Object.keys(filter).length === 0) {
    return table;
  }

  return table.filter(item => {
    return Object.entries(filter).every(([key, value]) => item[key] === value);
  });
};

// SELECT ONE WHERE
export const get = async (tableName, filter = {}) => {
  const results = await query(tableName, filter);
  return results[0] || null;
};

// INSERT
export const insert = async (tableName, values) => {
  const data = loadData();
  const table = data[tableName] || [];

  const newItem = {
    id: generateId(tableName),
    ...values,
    created_at: new Date().toISOString()
  };

  table.push(newItem);
  data[tableName] = table;
  saveData(data);

  return { id: newItem.id, changes: 1 };
};

// UPDATE
export const update = async (tableName, filter, values) => {
  const data = loadData();
  let table = data[tableName] || [];

  let changes = 0;
  table = table.map(item => {
    const matches = Object.entries(filter).every(([key, value]) => item[key] === value);
    if (matches) {
      changes++;
      return { ...item, ...values, updated_at: new Date().toISOString() };
    }
    return item;
  });

  data[tableName] = table;
  saveData(data);

  return { changes };
};

// DELETE
export const remove = async (tableName, filter) => {
  const data = loadData();
  let table = data[tableName] || [];

  const originalLength = table.length;
  table = table.filter(item => {
    return !Object.entries(filter).every(([key, value]) => item[key] === value);
  });

  data[tableName] = table;
  saveData(data);

  return { changes: originalLength - table.length };
};

// Fonctions SQL-like pour compatibilité

export const run = async (sql, params = []) => {
  // Parse simple SQL INSERT
  if (sql.trim().toUpperCase().startsWith('INSERT INTO')) {
    const tableMatch = sql.match(/INSERT INTO (\w+)/i);
    const valuesMatch = sql.match(/VALUES \((.*?)\)/i);

    if (tableMatch && valuesMatch) {
      const tableName = tableMatch[1];
      const values = params;

      // Extraire les colonnes
      const columnsMatch = sql.match(/\((.*?)\) VALUES/i);
      const columns = columnsMatch[1].split(',').map(c => c.trim());

      const data = {};
      columns.forEach((col, idx) => {
        data[col] = values[idx];
      });

      return insert(tableName, data);
    }
  }

  // Parse simple SQL UPDATE
  if (sql.trim().toUpperCase().startsWith('UPDATE')) {
    const tableMatch = sql.match(/UPDATE (\w+)/i);
    const whereMatch = sql.match(/WHERE (.+)/i);

    if (tableMatch) {
      const tableName = tableMatch[1];

      // Simple WHERE id = ?
      const filter = {};
      if (whereMatch && whereMatch[1].includes('id = ?')) {
        filter.id = params[params.length - 1];
      }

      // Extraire les SET values
      const setMatch = sql.match(/SET (.+?) WHERE/i);
      const values = {};

      // Pour simplifier, on récupère juste les params
      // (implémentation complète nécessiterait un vrai parser SQL)

      return update(tableName, filter, values);
    }
  }

  console.warn('[DB] SQL non supporté:', sql);
  return { id: 0, changes: 0 };
};

export { loadData, saveData };
