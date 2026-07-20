/**
 * Initialisation base de données SQLite (ESM compatible)
 */

import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'beninpay.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Créer connexion DB
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('[DB] Erreur ouverture:', err);
  } else {
    console.log('[DB] Connecté à', DB_PATH);
  }
});

// Initialiser le schéma
export const initDatabase = () => {
  return new Promise((resolve, reject) => {
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');

    db.exec(schema, (err) => {
      if (err) {
        console.error('[DB] Erreur création schéma:', err);
        reject(err);
      } else {
        console.log('[DB] Schéma initialisé');
        resolve();
      }
    });
  });
};

// Helper pour requêtes
export const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

export const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export { db };
