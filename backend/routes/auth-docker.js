import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { exec } from 'child_process';
import { promisify } from 'util';
import { executeSQL, querySQLObjects, generateUUID, formatDate } from '../services/sqlService.js';

const router = express.Router();
const execAsync = promisify(exec);

// Stockage temporaire des OTP en mémoire (pour production, utiliser Redis ou DB)
const otpStore = new Map(); // email -> { code, userId, expiresAt }

/**
 * Génère un code OTP à 6 chiffres
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Simule l'envoi d'email OTP (pour production, utiliser nodemailer ou SendGrid)
 */
async function sendOTPEmail(email, code) {
  // En développement, afficher le code dans la console
  console.log(`\n📧 EMAIL OTP POUR ${email}:`);
  console.log(`🔐 Code de vérification: ${code}`);
  console.log(`⏰ Ce code expire dans 10 minutes\n`);
  
  // TODO: En production, utiliser nodemailer ou SendGrid
  // Exemple avec nodemailer:
  // await transporter.sendMail({
  //   from: 'noreply@sige-guinee.gn',
  //   to: email,
  //   subject: 'Code de vérification SIGE-Guinée',
  //   html: `<p>Votre code de vérification est: <strong>${code}</strong></p>`
  // });
}

/**
 * Envoie l'ID SIGE par email après inscription
 */
async function sendSigeIdEmail(email, nom, sigeId) {
  // En développement, afficher dans la console
  console.log(`\n📧 ============================================`);
  console.log(`📧 EMAIL ID SIGE POUR ${email}`);
  console.log(`📧 ============================================`);
  console.log(`👤 Client: ${nom}`);
  console.log(`🆔 ID SIGE: ${sigeId}`);
  console.log(`📝 Sujet: Votre ID SIGE-Guinée - Identifiant de connexion`);
  console.log(`\n📧 Contenu de l'email:`);
  console.log(`   Bonjour ${nom},`);
  console.log(`   Votre compte SIGE-Guinée a été créé avec succès.`);
  console.log(`   \n   🆔 VOTRE ID SIGE UNIQUE : ${sigeId}`);
  console.log(`   \n   🔐 Comment vous connecter :`);
  console.log(`   • Utilisez votre ID SIGE : ${sigeId}`);
  console.log(`   • Ou utilisez votre email : ${email}`);
  console.log(`   • Avec le mot de passe que vous avez choisi`);
  console.log(`   \n   ⚠️ IMPORTANT : Conservez cet ID SIGE précieusement.`);
  console.log(`   Il est votre identifiant unique dans le système.`);
  console.log(`\n📧 ============================================\n`);
  
  // TODO: En production, utiliser nodemailer ou SendGrid
  // Exemple avec nodemailer:
  // await transporter.sendMail({
  //   from: 'noreply@sige-guinee.gn',
  //   to: email,
  //   subject: 'Votre ID SIGE-Guinée - Identifiant de connexion',
  //   html: `
  //     <h2>Bienvenue sur SIGE-Guinée !</h2>
  //     <p>Bonjour ${nom},</p>
  //     <p>Votre compte a été créé avec succès.</p>
  //     <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
  //       <h3 style="color: #1e40af;">🆔 Votre ID SIGE unique : <strong>${sigeId}</strong></h3>
  //     </div>
  //     <p><strong>🔐 Comment vous connecter :</strong></p>
  //     <ul>
  //       <li>Utilisez votre <strong>ID SIGE</strong> : <code>${sigeId}</code></li>
  //       <li>Ou utilisez votre <strong>email</strong> : <code>${email}</code></li>
  //       <li>Avec le mot de passe que vous avez choisi</li>
  //     </ul>
  //     <p style="color: #dc2626; font-weight: bold;">⚠️ IMPORTANT : Conservez cet ID SIGE précieusement. Il est votre identifiant unique dans le système.</p>
  //   `
  // });
}

/**
 * Exécute une requête SQL via docker exec
 */
async function querySQL(sql, params = []) {
  // Échapper les paramètres pour la sécurité
  let safeSql = sql;
  params.forEach((param, index) => {
    const escaped = typeof param === 'string' 
      ? param.replace(/'/g, "''") 
      : param;
    safeSql = safeSql.replace(`$${index + 1}`, `'${escaped}'`);
  });
  
  const command = `docker exec sige-postgres psql -U postgres -d sige_guinee -t -A -F "|" -c "${safeSql}"`;
  const { stdout } = await execAsync(command);
  
  if (!stdout.trim()) {
    return { rows: [] };
  }
  
  // Parser la sortie
  const lines = stdout.trim().split('\n');
  const rows = lines.map(line => {
    const values = line.split('|');
    return {
      id: values[0],
      nom: values[1],
      email: values[2],
      password_hash: values[3],
      role: values[4],
    };
  });
  
  return { rows };
}

/**
 * POST /api/auth/login
 * Connexion d'un utilisateur (version avec docker exec)
 */
router.post(
  '/login',
  [
    body('identifier').notEmpty().withMessage('Identifiant requis (ID SIGE ou email)'),
    body('password').notEmpty().withMessage('Mot de passe requis'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { identifier, password } = req.body;

      // Déterminer si c'est un email ou un ID SIGE
      const isSigeId = /^GUI-[A-Z]{3}-\d{5}$/i.test(identifier);
      const isEmail = identifier.includes('@');

      // Trouver l'utilisateur par email OU par ID SIGE
      let result;
      if (isSigeId) {
        // Recherche par ID SIGE
        result = await querySQLObjects(
          'SELECT id, nom, email, password_hash, role, status, edg_subrole, sige_id, client_type FROM users WHERE sige_id = $1',
          [identifier.toUpperCase()],
          ['id', 'nom', 'email', 'password_hash', 'role', 'status', 'edg_subrole', 'sige_id', 'client_type']
        );
      } else if (isEmail) {
        // Recherche par email (normalisé)
        const normalizedEmail = identifier.toLowerCase().trim();
        result = await querySQLObjects(
          'SELECT id, nom, email, password_hash, role, status, edg_subrole, sige_id, client_type FROM users WHERE email = $1',
          [normalizedEmail],
          ['id', 'nom', 'email', 'password_hash', 'role', 'status', 'edg_subrole', 'sige_id', 'client_type']
        );
      } else {
        return res.status(400).json({ 
          error: 'Format invalide. Utilisez votre ID SIGE (ex: GUI-DIX-00001) ou votre email.' 
        });
      }

      if (result.length === 0) {
        return res.status(401).json({ 
          error: 'Identifiant ou mot de passe incorrect',
          hint: isSigeId ? 'Vérifiez votre ID SIGE' : 'Vérifiez votre email'
        });
      }

      const user = result[0];

      // Vérifier le mot de passe
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
      }

      // Vérifier si le compte est actif (pour AGENT_EDG uniquement)
      if (user.role === 'AGENT_EDG' && user.status !== 'ACTIVE') {
        return res.status(403).json({ 
          error: 'Compte en attente de validation',
          status: user.status || 'PENDING',
          message: 'Votre compte est en attente de validation par un administrateur. Vous recevrez un email une fois votre compte activé.'
        });
      }

      // Pour les agents EDG et admins État, connexion directe sans OTP
      if (user.role === 'AGENT_EDG' || user.role === 'ADMIN_ETAT') {
        const token = jwt.sign(
          { userId: user.id, role: user.role },
          process.env.JWT_SECRET || 'sige_secret_key_dev',
          { expiresIn: '24h' }
        );

        return res.json({
          message: 'Connexion réussie',
          token,
          user: {
            id: user.id,
            nom: user.nom,
            email: user.email,
            role: user.role,
            edgSubrole: user.edg_subrole || null,
            status: user.status || 'ACTIVE',
            sigeId: user.sige_id || null,
            clientType: user.client_type || null,
          },
          requiresOTP: false,
        });
      }

      // Pour les citoyens, générer un code OTP à 6 chiffres
      const otpCode = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Normaliser l'email de l'utilisateur pour la clé du store OTP
      const userEmail = user.email.toLowerCase();

      // Stocker l'OTP avec les informations utilisateur
      otpStore.set(userEmail, {
        code: otpCode,
        userId: user.id,
        email: user.email,
        expiresAt,
      });

      // Envoyer l'OTP par email (simulé en dev)
      await sendOTPEmail(user.email, otpCode);

      // Retourner une réponse demandant la vérification OTP avec l'ID SIGE
      res.json({
        message: 'Code de vérification envoyé par email',
        requiresOTP: true,
        email: user.email, // Pour confirmer l'email utilisé
        sigeId: user.sige_id || null, // Inclure l'ID SIGE pour affichage
        user: {
          email: user.email,
          sigeId: user.sige_id || null,
        },
      });
    } catch (error) {
      console.error('Erreur connexion:', error);
      res.status(500).json({ error: 'Erreur lors de la connexion' });
    }
  }
);

/**
 * POST /api/auth/verify-otp
 * Vérifie le code OTP et connecte l'utilisateur
 */
router.post(
  '/verify-otp',
  [
    body('email').isEmail().normalizeEmail(),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('Le code OTP doit contenir 6 chiffres'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, otp } = req.body;
      const emailLower = email.toLowerCase();

      // Vérifier si un OTP existe pour cet email
      const otpData = otpStore.get(emailLower);

      if (!otpData) {
        return res.status(400).json({ error: 'Aucun code de vérification trouvé. Veuillez vous connecter à nouveau.' });
      }

      // Vérifier si l'OTP a expiré
      if (new Date() > otpData.expiresAt) {
        otpStore.delete(emailLower);
        return res.status(400).json({ error: 'Le code de vérification a expiré. Veuillez demander un nouveau code.' });
      }

      // Vérifier le code OTP
      if (otpData.code !== otp) {
        return res.status(400).json({ error: 'Code de vérification incorrect' });
      }

      // OTP valide - récupérer l'utilisateur avec sige_id
      const result = await querySQLObjects(
        'SELECT id, nom, email, role, sige_id, client_type FROM users WHERE id = $1',
        [otpData.userId],
        ['id', 'nom', 'email', 'role', 'sige_id', 'client_type']
      );

      if (result.length === 0) {
        otpStore.delete(emailLower);
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      const user = result[0];

      // Générer le token JWT
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-min-32-chars',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      // Supprimer l'OTP utilisé
      otpStore.delete(emailLower);

      res.json({
        message: 'Connexion réussie',
        token,
        user: {
          id: user.id,
          nom: user.nom,
          email: user.email,
          role: user.role,
          sigeId: user.sige_id || null,
          clientType: user.client_type || null,
        },
      });
    } catch (error) {
      console.error('Erreur vérification OTP:', error);
      res.status(500).json({ error: 'Erreur lors de la vérification' });
    }
  }
);

/**
 * POST /api/auth/resend-otp
 * Renvoie un nouveau code OTP
 */
router.post(
  '/resend-otp',
  [
    body('email').isEmail().normalizeEmail(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email } = req.body;
      const emailLower = email.toLowerCase();

      // Vérifier si l'utilisateur existe
      const result = await querySQL(
        'SELECT id, nom, email FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Email non trouvé' });
      }

      const user = result.rows[0];

      // Générer un nouveau code OTP
      const otpCode = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Stocker le nouvel OTP
      otpStore.set(emailLower, {
        code: otpCode,
        userId: user.id,
        email: user.email,
        expiresAt,
      });

      // Envoyer l'OTP par email
      await sendOTPEmail(email, otpCode);

      res.json({
        message: 'Nouveau code de vérification envoyé par email',
        email: email,
      });
    } catch (error) {
      console.error('Erreur renvoi OTP:', error);
      res.status(500).json({ error: 'Erreur lors de l\'envoi du code' });
    }
  }
);

/**
 * POST /api/auth/register
 * Inscription d'un nouvel utilisateur (version avec docker exec)
 */
router.post(
  '/register',
  [
    body('nom').trim().notEmpty().withMessage('Le nom est requis'),
    body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
    body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
    body('role').optional().isIn(['CITOYEN', 'AGENT_EDG']).withMessage('Rôle invalide'),
    body('telephone').optional().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { nom, email, password, role = 'CITOYEN', telephone } = req.body;

      // Vérifier si l'email existe déjà
      const existingUsers = await querySQLObjects(
        'SELECT id FROM users WHERE email = $1',
        [email],
        ['id']
      );

      if (existingUsers.length > 0) {
        return res.status(400).json({ error: 'Cet email est déjà utilisé' });
      }

      // Hasher le mot de passe
      const passwordHash = await bcrypt.hash(password, 10);

      // Générer un ID unique
      const userId = generateUUID();
      const now = new Date();

      // Déterminer le status et client_type selon le rôle
      let userStatus = 'ACTIVE';
      let edgSubrole = null;
      let clientType = null;
      
      // Si c'est un agent EDG, le compte est en attente de validation
      if (role === 'AGENT_EDG') {
        userStatus = 'PENDING';
        edgSubrole = null; // Sera assigné par l'admin
      } else if (role === 'CITOYEN') {
        clientType = 'USAGER';
      }

      // Insérer l'utilisateur
      await executeSQL(
        `INSERT INTO users (id, nom, email, password_hash, role, status, edg_subrole, telephone, client_type, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          userId, 
          nom, 
          email, 
          passwordHash, 
          role, 
          userStatus,
          edgSubrole,
          telephone || null,
          clientType,
          formatDate(now), 
          formatDate(now)
        ]
      );

      // Le trigger génère automatiquement l'ID SIGE pour les CITOYEN
      // Si le trigger n'a pas fonctionné, générer manuellement
      if (role === 'CITOYEN') {
        // Attendre un peu pour que le trigger s'exécute
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Vérifier si l'ID SIGE a été généré
        let checkUser = await querySQLObjects(
          'SELECT sige_id FROM users WHERE id = $1',
          [userId],
          ['sige_id']
        );
        
        // Si pas d'ID SIGE, générer manuellement via la fonction PostgreSQL
        if (!checkUser[0]?.sige_id) {
          const city = 'Conakry'; // Par défaut, sera mis à jour si un foyer est créé
          try {
            // Appeler la fonction PostgreSQL generate_sige_id
            await executeSQL(
              `SELECT generate_sige_id('${userId}'::uuid, '${city}', '${role}')`,
              []
            );
          } catch (err) {
            console.error('Erreur génération ID SIGE:', err);
            // Continuer même si la génération échoue
          }
        }
      }

      // Récupérer l'utilisateur créé avec son ID SIGE
      const newUsers = await querySQLObjects(
        'SELECT id, nom, email, role, status, edg_subrole, sige_id, client_type, created_at, updated_at FROM users WHERE id = $1',
        [userId],
        ['id', 'nom', 'email', 'role', 'status', 'edg_subrole', 'sige_id', 'client_type', 'created_at', 'updated_at']
      );

      if (newUsers.length === 0) {
        return res.status(500).json({ error: 'Erreur lors de la création du compte' });
      }

      const newUser = newUsers[0];

      // Si c'est un agent EDG, le compte est en attente de validation (pas d'OTP)
      if (role === 'AGENT_EDG') {
        // TODO: Envoyer une notification aux admins système pour validation
        console.log(`\n🔔 NOUVEAU COMPTE AGENT EDG EN ATTENTE:`);
        console.log(`   Nom: ${nom}`);
        console.log(`   Email: ${email}`);
        console.log(`   Téléphone: ${telephone || 'Non renseigné'}`);
        console.log(`   → Un administrateur doit valider ce compte et assigner un sous-rôle\n`);

        return res.status(201).json({
          message: 'Compte créé avec succès. En attente de validation par un administrateur.',
          requiresOTP: false,
          status: 'PENDING',
          email: email,
          user: {
            id: newUser.id,
            nom: newUser.nom,
            email: newUser.email,
            role: newUser.role,
            status: newUser.status,
            edgSubrole: newUser.edg_subrole,
          },
        });
      }

      // Pour les citoyens, envoyer l'ID SIGE par email
      if (newUser.sige_id) {
        // Envoyer l'ID SIGE par email
        await sendSigeIdEmail(email, nom, newUser.sige_id);
      }

      // Générer un code OTP à 6 chiffres pour vérifier l'email
      const otpCode = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Stocker l'OTP avec les informations utilisateur
      const emailLower = email.toLowerCase();
      otpStore.set(emailLower, {
        code: otpCode,
        userId: newUser.id,
        email: newUser.email,
        expiresAt,
      });

      // Envoyer l'OTP par email (simulé en dev)
      await sendOTPEmail(email, otpCode);

      // Retourner une réponse avec l'ID SIGE et demander la vérification OTP
      res.status(201).json({
        message: 'Compte créé avec succès. Votre ID SIGE et le code de vérification ont été envoyés par email.',
        requiresOTP: true,
        email: email,
        sigeId: newUser.sige_id || null,
        hint: newUser.sige_id 
          ? `Votre ID SIGE ${newUser.sige_id} vous a été envoyé par email. Vous pourrez l'utiliser pour vous connecter après vérification.`
          : 'Votre ID SIGE sera généré et envoyé par email.',
      });
    } catch (error) {
      console.error('Erreur inscription:', error);
      res.status(500).json({ error: 'Erreur lors de l\'inscription' });
    }
  }
);

/**
 * GET /api/auth/me
 * Récupérer l'utilisateur connecté (version avec docker exec)
 */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token manquant' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-min-32-chars');

    const result = await querySQL(
      'SELECT id, nom, email, role, created_at, updated_at FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Erreur récupération utilisateur:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

export default router;
