// Exemple de test pour le backend
// Ce fichier sert de modèle pour créer d'autres tests

describe('Exemple de test', () => {
  test('Test basique - devrait passer', () => {
    expect(1 + 1).toBe(2);
  });

  test('Test d\'asynchrone', async () => {
    const result = await Promise.resolve('success');
    expect(result).toBe('success');
  });
});

// Exemple de test d'API (à décommenter quand vous voulez tester)
/*
import request from 'supertest';
import app from '../server.js';

describe('API Health Check', () => {
  test('GET /api/health devrait retourner 200', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);
    
    expect(response.body).toHaveProperty('status');
  });
});
*/
