import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'database.sqlite');

const db = new Database(dbPath);

// Create Users Table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    avatar TEXT,
    bio TEXT DEFAULT 'Estudante dedicado!',
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create Rankings/Progress Table
// We link this to users. For simplicity, one entry per user that gets updated.
db.exec(`
  CREATE TABLE IF NOT EXISTS user_progress (
    user_id TEXT PRIMARY KEY,
    hours REAL DEFAULT 0,
    points INTEGER DEFAULT 0,
    trend TEXT DEFAULT 'neutral',
    FOREIGN KEY (user_id) REFERENCES users (id)
  )
`);

// Create Posts Table
db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    image_start TEXT,
    image_end TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  )
`);

// Create Groups Table
db.exec(`
  CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    image TEXT,
    creator_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users (id)
  )
`);

// MIGRATIONS
try {
  db.exec("ALTER TABLE groups ADD COLUMN image TEXT");
} catch (e) { }

try {
  db.exec("ALTER TABLE groups ADD COLUMN is_private BOOLEAN DEFAULT 0");
} catch (e) { }

try {
  db.exec("ALTER TABLE groups ADD COLUMN invite_code TEXT");
} catch (e) { }

try {
  db.exec("ALTER TABLE users ADD COLUMN last_seen DATETIME");
} catch (e) { }

// Create Group Members Table (many-to-many)
db.exec(`
  CREATE TABLE IF NOT EXISTS group_members (
    group_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, user_id),
    FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  )
`);

// Create Post Likes Table
db.exec(`
  CREATE TABLE IF NOT EXISTS post_likes (
    post_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, user_id),
    FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  )
`);

// Create Quiz Answers Table
db.exec(`
  CREATE TABLE IF NOT EXISTS quiz_answers (
    post_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    option_index INTEGER NOT NULL,
    is_correct BOOLEAN NOT NULL,
    answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, user_id),
    FOREIGN KEY (post_id) REFERENCES group_posts (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  )
`);

// Create Post Comments Table
db.exec(`
  CREATE TABLE IF NOT EXISTS post_comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  )
`);

// Create Follows Table
db.exec(`
  CREATE TABLE IF NOT EXISTS follows (
    follower_id TEXT NOT NULL,
    following_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, following_id),
    FOREIGN KEY (follower_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES users (id) ON DELETE CASCADE
  )
`);

// Create Notifications Table
db.exec(`
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    related_id TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  )
`);

// Create Group Posts Table
db.exec(`
  CREATE TABLE IF NOT EXISTS group_posts (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  )
`);

// Seed initial data if empty (to match the mock data in App.tsx)
const stmt = db.prepare('SELECT count(*) as count FROM users');
const { count } = stmt.get();

if (count === 0) {
  console.log('Seeding initial data...');
  const insertUser = db.prepare('INSERT INTO users (id, name, email, password, avatar, bio, followers_count, following_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const insertProgress = db.prepare('INSERT INTO user_progress (user_id, hours, points, trend) VALUES (?, ?, ?, ?)');

  const mockUsers = [
    { id: 'u1', name: 'Bruno Gomes', email: 'bruno@example.com', avatar: 'https://picsum.photos/id/12/100/100', bio: 'Focado em Medicina', followers: 120, following: 45, hours: 120.5, points: 1500, trend: 'up' },
    { id: 'u2', name: 'Juliana Lima', email: 'juliana@example.com', avatar: 'https://picsum.photos/id/65/100/100', bio: 'Concurseira Fiscal', followers: 340, following: 200, hours: 115.75, points: 1420, trend: 'neutral' },
    { id: 'u3', name: 'Carlos Souza', email: 'carlos@example.com', avatar: 'https://picsum.photos/id/91/100/100', bio: 'Estudando para OAB', followers: 50, following: 60, hours: 112.2, points: 1350, trend: 'down' },
    { id: 'u4', name: 'Mariana Costa', email: 'mariana@example.com', avatar: 'https://picsum.photos/id/101/100/100', bio: 'Vestibulanda', followers: 89, following: 100, hours: 108.9, points: 1100, trend: 'up' },
    { id: 'u5', name: 'Lucas Martins', email: 'lucas@example.com', avatar: 'https://picsum.photos/id/177/100/100', bio: 'Dev Fullstack', followers: 200, following: 150, hours: 105.3, points: 980, trend: 'up' },
  ];

  // Note: In a real app, passwords should be hashed. For seeding mock users, we'll use a placeholder hash or plain text if we handle it in the auth logic.
  // Let's assume we'll hash passwords in the register route. For these seeds, we'll put a dummy hash.
  const dummyHash = '$2a$10$abcdefg'; // Mock hash

  mockUsers.forEach(u => {
    insertUser.run(u.id, u.name, u.email, dummyHash, u.avatar, u.bio, u.followers, u.following);
    insertProgress.run(u.id, u.hours, u.points, u.trend);
  });
}

export default db;
