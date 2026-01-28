// Configuration globale pour les tests
// Ce fichier s'exécute avant chaque test

// Configuration des variables d'environnement pour les tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-min-32-chars';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sige_guinee_test?schema=public';
process.env.PORT = '5001'; // Port différent pour les tests

// Timeout global pour les tests
jest.setTimeout(10000);

// Nettoyage après les tests
afterAll(async () => {
  // Nettoyage si nécessaire
});
