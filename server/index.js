import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from './database.js';
import { randomUUID } from 'crypto';

const app = express();
const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- AUTH ROUTES ---

app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const id = randomUUID();
        const avatar = `https://picsum.photos/seed/${id}/100/100`; // Random avatar

        const insertUser = db.prepare('INSERT INTO users (id, name, email, password, avatar, bio, followers_count, following_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        const insertProgress = db.prepare('INSERT INTO user_progress (user_id) VALUES (?)');

        const transaction = db.transaction(() => {
            insertUser.run(id, name, email, hashedPassword, avatar, 'Estudante novo!', 0, 0);
            insertProgress.run(id);
        });

        transaction();

        const token = jwt.sign({ id, email }, JWT_SECRET, { expiresIn: '24h' });
        res.status(201).json({ token, user: { id, name, email, avatar } });
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(409).json({ message: 'Email already exists' });
        }
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
        const user = stmt.get(email);

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// --- DATA ROUTES ---

app.get('/api/users/me', authenticateToken, (req, res) => {
    try {
        const stmt = db.prepare(`
            SELECT u.id, u.name, u.email, u.avatar, u.bio, u.followers_count, u.following_count, p.hours, p.points, p.trend 
            FROM users u 
            JOIN user_progress p ON u.id = p.user_id 
            WHERE u.id = ?
        `);
        const user = stmt.get(req.user.id);
        if (!user) return res.sendStatus(404);
        res.json(user);
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

app.get('/api/rankings', (req, res) => {
    try {
        const stmt = db.prepare(`
            SELECT u.id, u.name, u.avatar, p.hours, p.points, p.trend 
            FROM users u 
            JOIN user_progress p ON u.id = p.user_id 
            ORDER BY p.points DESC
        `);
        const users = stmt.all();

        // Calculate rank dynamically
        const rankings = users.map((u, index) => ({
            rank: index + 1,
            user: { id: u.id, name: u.name, avatar: u.avatar },
            hours: u.hours,
            points: u.points,
            trend: u.trend
        }));

        res.json(rankings);
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

app.post('/api/users/progress', authenticateToken, (req, res) => {
    const { hours, points } = req.body;

    try {
        const updateStmt = db.prepare(`
            UPDATE user_progress 
            SET hours = hours + ?, points = points + ? 
            WHERE user_id = ?
        `);
        updateStmt.run(hours || 0, points || 0, req.user.id);
        res.json({ message: 'Progress updated' });
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

// --- POSTS ROUTES ---

app.post('/api/posts', authenticateToken, (req, res) => {
    const { content, imageStart, imageEnd } = req.body;

    if (!content) {
        return res.status(400).json({ message: 'Content is required' });
    }

    try {
        const id = randomUUID();
        const stmt = db.prepare('INSERT INTO posts (id, user_id, content, image_start, image_end) VALUES (?, ?, ?, ?, ?)');
        stmt.run(id, req.user.id, content, imageStart || null, imageEnd || null);
        res.status(201).json({ id, message: 'Post created' });
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

app.get('/api/posts', (req, res) => {
    try {
        const stmt = db.prepare(`
            SELECT p.id, p.content, p.image_start, p.image_end, p.created_at, u.id as user_id, u.name, u.avatar
            FROM posts p
            JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
            LIMIT 50
        `);
        const posts = stmt.all();

        const formatted = posts.map(p => ({
            id: p.id,
            content: p.content,
            imageStart: p.image_start,
            imageEnd: p.image_end,
            createdAt: p.created_at,
            user: { id: p.user_id, name: p.name, avatar: p.avatar }
        }));

        res.json(formatted);
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

app.delete('/api/posts/:id', authenticateToken, (req, res) => {
    try {
        const stmt = db.prepare('DELETE FROM posts WHERE id = ? AND user_id = ?');
        const result = stmt.run(req.params.id, req.user.id);

        if (result.changes === 0) {
            return res.status(404).json({ message: 'Post not found or unauthorized' });
        }

        res.json({ message: 'Post deleted' });
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

app.put('/api/posts/:id', authenticateToken, (req, res) => {
    const { content } = req.body;

    if (!content) {
        return res.status(400).json({ message: 'Content is required' });
    }

    try {
        const stmt = db.prepare('UPDATE posts SET content = ? WHERE id = ? AND user_id = ?');
        const result = stmt.run(content, req.params.id, req.user.id);

        if (result.changes === 0) {
            return res.status(404).json({ message: 'Post not found or unauthorized' });
        }

        res.json({ message: 'Post updated' });
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

// --- GROUPS ROUTES ---

app.post('/api/groups', authenticateToken, (req, res) => {
    const { name, description, image, isPrivate } = req.body;

    if (!name) {
        return res.status(400).json({ message: 'Group name is required' });
    }

    try {
        const id = randomUUID();
        const inviteCode = randomUUID().substring(0, 8); // Simple invite code

        const insertGroup = db.prepare('INSERT INTO groups (id, name, description, image, creator_id, is_private, invite_code) VALUES (?, ?, ?, ?, ?, ?, ?)');
        const insertMember = db.prepare('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)');

        const transaction = db.transaction(() => {
            insertGroup.run(id, name, description || '', image || null, req.user.id, isPrivate ? 1 : 0, inviteCode);
            insertMember.run(id, req.user.id); // Creator auto-joins
        });

        transaction();
        res.status(201).json({ id, message: 'Group created', inviteCode });
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

// Get all public groups
app.get('/api/groups', (req, res) => {
    try {
        const stmt = db.prepare(`
            SELECT g.id, g.name, g.description, g.image, g.created_at, g.creator_id, g.is_private,
            u.name as creator_name,
            COUNT(gm.user_id) as member_count
            FROM groups g
            JOIN users u ON g.creator_id = u.id
            LEFT JOIN group_members gm ON g.id = gm.group_id
            WHERE g.is_private = 0
            GROUP BY g.id
            ORDER BY g.created_at DESC
            `);
        const groups = stmt.all();
        res.json(groups);
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

// Join group via Code
app.post('/api/groups/join-code', authenticateToken, (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: 'Code required' });

    try {
        const groupStmt = db.prepare('SELECT id, name FROM groups WHERE invite_code = ?');
        const group = groupStmt.get(code);

        if (!group) return res.status(404).json({ message: 'Invalid invite code' });

        // Check if member
        const memberStmt = db.prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?');
        const isMember = memberStmt.get(group.id, req.user.id);

        if (isMember) {
            return res.json({ message: 'Already a member', groupId: group.id });
        }

        const stmt = db.prepare('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)');
        stmt.run(group.id, req.user.id);

        res.json({ message: 'Joined group', groupId: group.id });
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

// Get user's groups (groups the user has joined)
app.get('/api/users/me/groups', authenticateToken, (req, res) => {
    try {
        const stmt = db.prepare(`
            SELECT g.id, g.name, g.description, g.image, g.created_at, g.creator_id, g.is_private, g.invite_code,
                   u.name as creator_name,
                   COUNT(DISTINCT gm.user_id) as member_count
            FROM groups g
            JOIN users u ON g.creator_id = u.id
            JOIN group_members gm2 ON g.id = gm2.group_id AND gm2.user_id = ?
            LEFT JOIN group_members gm ON g.id = gm.group_id
            GROUP BY g.id
            ORDER BY g.created_at DESC
        `);
        const groups = stmt.all(req.user.id);
        res.json(groups);
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});


app.get('/api/groups/:id', authenticateToken, (req, res) => {
    try {
        const groupStmt = db.prepare(`
            SELECT g.*, u.name as creator_name
            FROM groups g
            JOIN users u ON g.creator_id = u.id
            WHERE g.id = ?
            `);
        const group = groupStmt.get(req.params.id);

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        const membersStmt = db.prepare(`
            SELECT u.id, u.name, u.avatar, u.last_seen
            FROM group_members gm
            JOIN users u ON gm.user_id = u.id
            WHERE gm.group_id = ?
            `);
        const members = membersStmt.all(req.params.id);

        // Calculate online members (active in last 5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const onlineCount = members.filter(m => m.last_seen > fiveMinutesAgo).length;

        // Check if current user is a member
        const isMember = members.some(m => m.id === req.user.id);

        // Return full info only if member or if public
        // NOTE: Even for public groups, we might want to hide member list if not joined? 
        // For now, following requirements: list only if entered.

        if (isMember) {
            res.json({ ...group, members, onlineCount, isMember: true });
        } else {
            // If not member, return basic info and NO member list
            // Unless it's public? Requirement says "so depois que vc entrou no grupo"
            res.json({
                id: group.id,
                name: group.name,
                description: group.description,
                image: group.image,
                creator_id: group.creator_id,
                creator_name: group.creator_name,
                member_count: members.length,
                is_private: group.is_private,
                isMember: false
            });
        }

    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

app.post('/api/groups/:id/join', authenticateToken, (req, res) => {
    try {
        // If private, cannot join directly unless already invited (but here we assume join via button is for public)
        const groupStmt = db.prepare('SELECT is_private FROM groups WHERE id = ?');
        const group = groupStmt.get(req.params.id);

        if (!group) return res.status(404).json({ message: 'Group not found' });

        if (group.is_private) {
            return res.status(403).json({ message: 'Cannot join private group directly. Use invite link.' });
        }

        const stmt = db.prepare('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)');
        stmt.run(req.params.id, req.user.id);
        res.json({ message: 'Joined group' });
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT') {
            return res.status(400).json({ message: 'Already a member' });
        }
        console.error(error);
        res.sendStatus(500);
    }
});

app.delete('/api/groups/:id/leave', authenticateToken, (req, res) => {
    try {
        const stmt = db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?');
        const result = stmt.run(req.params.id, req.user.id);

        if (result.changes === 0) {
            return res.status(404).json({ message: 'Not a member' });
        }

        res.json({ message: 'Left group' });
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

// Delete group (only creator)
app.delete('/api/groups/:id', authenticateToken, (req, res) => {
    try {
        // Check if user is the creator
        const groupStmt = db.prepare('SELECT creator_id FROM groups WHERE id = ?');
        const group = groupStmt.get(req.params.id);

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        if (group.creator_id !== req.user.id) {
            return res.status(403).json({ message: 'Only the creator can delete this group' });
        }

        // Delete group (CASCADE will handle members and posts)
        const deleteStmt = db.prepare('DELETE FROM groups WHERE id = ?');
        deleteStmt.run(req.params.id);

        res.json({ message: 'Group deleted' });
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

// Update group (only creator)
app.put('/api/groups/:id', authenticateToken, (req, res) => {
    const { name, description, image } = req.body;

    if (!name) {
        return res.status(400).json({ message: 'Group name is required' });
    }

    try {
        // Check if user is the creator
        const groupStmt = db.prepare('SELECT creator_id FROM groups WHERE id = ?');
        const group = groupStmt.get(req.params.id);

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        if (group.creator_id !== req.user.id) {
            return res.status(403).json({ message: 'Only the creator can update this group' });
        }

        const updateStmt = db.prepare('UPDATE groups SET name = ?, description = ?, image = ? WHERE id = ?');
        updateStmt.run(name, description || '', image || null, req.params.id);

        res.json({ message: 'Group updated' });
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

// Add member to group (only creator - invite)
app.post('/api/groups/:id/members', authenticateToken, (req, res) => {
    const { userId } = req.body; // User to add

    if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    try {
        // Check if user is the creator
        const groupStmt = db.prepare('SELECT creator_id, name FROM groups WHERE id = ?');
        const group = groupStmt.get(req.params.id);

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        if (group.creator_id !== req.user.id) {
            return res.status(403).json({ message: 'Only the creator can add members' });
        }

        // Check if already a member
        const memberStmt = db.prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?');
        const isMember = memberStmt.get(req.params.id, userId);

        if (isMember) {
            return res.status(400).json({ message: 'User is already a member' });
        }

        const stmt = db.prepare('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)');
        stmt.run(req.params.id, userId);

        // Notify user
        const notifStmt = db.prepare('INSERT INTO notifications (id, user_id, type, content, related_id) VALUES (?, ?, ?, ?, ?)');
        notifStmt.run(randomUUID(), userId, 'group_invite', `Você foi adicionado ao grupo ${group.name}`, req.params.id);

        res.json({ message: 'Member added' });
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

// Remove member from group (only creator)
app.delete('/api/groups/:id/members/:userId', authenticateToken, (req, res) => {
    try {
        // Check if user is the creator
        const groupStmt = db.prepare('SELECT creator_id FROM groups WHERE id = ?');
        const group = groupStmt.get(req.params.id);

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        if (group.creator_id !== req.user.id) {
            return res.status(403).json({ message: 'Only the creator can remove members' });
        }

        // Don't allow removing the creator
        if (req.params.userId === req.user.id) {
            return res.status(400).json({ message: 'Cannot remove yourself as creator' });
        }

        const stmt = db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?');
        stmt.run(req.params.id, req.params.userId);

        res.json({ message: 'Member removed' });
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

// --- PROFILE & ACCOUNT MANAGEMENT ---

app.put('/api/users/profile', authenticateToken, (req, res) => {
    const { name, bio, avatar } = req.body;

    try {
        const stmt = db.prepare('UPDATE users SET name = ?, bio = ?, avatar = ? WHERE id = ?');
        stmt.run(name, bio, avatar, req.user.id);
        res.json({ message: 'Profile updated' });
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

app.put('/api/users/password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Both passwords required' });
    }

    try {
        const userStmt = db.prepare('SELECT password FROM users WHERE id = ?');
        const user = userStmt.get(req.user.id);

        const validPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updateStmt = db.prepare('UPDATE users SET password = ? WHERE id = ?');
        updateStmt.run(hashedPassword, req.user.id);

        res.json({ message: 'Password updated' });
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

app.delete('/api/users/account', authenticateToken, async (req, res) => {
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ message: 'Password required' });
    }

    try {
        const userStmt = db.prepare('SELECT password FROM users WHERE id = ?');
        const user = userStmt.get(req.user.id);

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Incorrect password' });
        }

        // Delete user (CASCADE will handle related records)
        const deleteStmt = db.prepare('DELETE FROM users WHERE id = ?');
        deleteStmt.run(req.user.id);

        res.json({ message: 'Account deleted' });
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

// --- POST INTERACTIONS ---

// Like/Unlike a post
app.post('/api/posts/:id/like', authenticateToken, (req, res) => {
    try {
        const checkStmt = db.prepare('SELECT * FROM post_likes WHERE post_id = ? AND user_id = ?');
        const existing = checkStmt.get(req.params.id, req.user.id);

        if (existing) {
            // Unlike
            const deleteStmt = db.prepare('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?');
            deleteStmt.run(req.params.id, req.user.id);
            res.json({ liked: false });
        } else {
            // Like
            const insertStmt = db.prepare('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)');
            insertStmt.run(req.params.id, req.user.id);

            // Create notification for post owner
            const postStmt = db.prepare('SELECT user_id FROM posts WHERE id = ?');
            const post = postStmt.get(req.params.id);

            if (post && post.user_id !== req.user.id) {
                const userStmt = db.prepare('SELECT name FROM users WHERE id = ?');
                const user = userStmt.get(req.user.id);

                const notifStmt = db.prepare('INSERT INTO notifications (id, user_id, type, content, related_id) VALUES (?, ?, ?, ?, ?)');
                notifStmt.run(randomUUID(), post.user_id, 'like', `${user.name} curtiu sua postagem`, req.params.id);
            }

            res.json({ liked: true });
        }
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

// Get post likes
app.get('/api/posts/:id/likes', (req, res) => {
    try {
        const stmt = db.prepare('SELECT COUNT(*) as count FROM post_likes WHERE post_id = ?');
        const result = stmt.get(req.params.id);
        res.json({ count: result.count });
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

// Add comment to post
app.post('/api/posts/:id/comments', authenticateToken, (req, res) => {
    const { content } = req.body;

    if (!content) {
        return res.status(400).json({ message: 'Content is required' });
    }

    try {
        const id = randomUUID();
        const stmt = db.prepare('INSERT INTO post_comments (id, post_id, user_id, content) VALUES (?, ?, ?, ?)');
        stmt.run(id, req.params.id, req.user.id, content);

        // Create notification for post owner
        const postStmt = db.prepare('SELECT user_id FROM posts WHERE id = ?');
        const post = postStmt.get(req.params.id);

        if (post && post.user_id !== req.user.id) {
            const userStmt = db.prepare('SELECT name FROM users WHERE id = ?');
            const user = userStmt.get(req.user.id);

            const notifStmt = db.prepare('INSERT INTO notifications (id, user_id, type, content, related_id) VALUES (?, ?, ?, ?, ?)');
            notifStmt.run(randomUUID(), post.user_id, 'comment', `${user.name} comentou em sua postagem`, req.params.id);
        }

        res.status(201).json({ id });
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

// Get post comments
app.get('/api/posts/:id/comments', (req, res) => {
    try {
        const stmt = db.prepare(`
            SELECT c.id, c.content, c.created_at, u.id as user_id, u.name, u.avatar
            FROM post_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.post_id = ?
            ORDER BY c.created_at DESC
        `);
        const comments = stmt.all(req.params.id);

        const formatted = comments.map(c => ({
            id: c.id,
            content: c.content,
            createdAt: c.created_at,
            user: { id: c.user_id, name: c.name, avatar: c.avatar }
        }));

        res.json(formatted);
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

app.put('/api/comments/:id', authenticateToken, (req, res) => {
    const { content } = req.body;

    if (!content) {
        return res.status(400).json({ message: 'Content is required' });
    }

    try {
        const stmt = db.prepare('UPDATE post_comments SET content = ? WHERE id = ? AND user_id = ?');
        const result = stmt.run(content, req.params.id, req.user.id);

        if (result.changes === 0) {
            return res.status(404).json({ message: 'Comment not found or unauthorized' });
        }

        res.json({ message: 'Comment updated' });
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

app.delete('/api/comments/:id', authenticateToken, (req, res) => {
    try {
        const stmt = db.prepare('DELETE FROM post_comments WHERE id = ? AND user_id = ?');
        const result = stmt.run(req.params.id, req.user.id);

        if (result.changes === 0) {
            return res.status(404).json({ message: 'Comment not found or unauthorized' });
        }

        res.json({ message: 'Comment deleted' });
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

// --- FOLLOW SYSTEM ---

// Follow a user
app.post('/api/users/:id/follow', authenticateToken, (req, res) => {
    if (req.params.id === req.user.id) {
        return res.status(400).json({ message: 'Cannot follow yourself' });
    }

    try {
        const stmt = db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)');
        stmt.run(req.user.id, req.params.id);

        // Update counts
        db.prepare('UPDATE users SET followers_count = followers_count + 1 WHERE id = ?').run(req.params.id);
        db.prepare('UPDATE users SET following_count = following_count + 1 WHERE id = ?').run(req.user.id);

        // Create notification
        const userStmt = db.prepare('SELECT name FROM users WHERE id = ?');
        const user = userStmt.get(req.user.id);

        const notifStmt = db.prepare('INSERT INTO notifications (id, user_id, type, content, related_id) VALUES (?, ?, ?, ?, ?)');
        notifStmt.run(randomUUID(), req.params.id, 'follow', `${user.name} começou a seguir você`, req.user.id);

        res.json({ message: 'Followed' });
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT') {
            return res.status(400).json({ message: 'Already following' });
        }
        console.error(error);
        res.sendStatus(500);
    }
});

// Unfollow a user
app.delete('/api/users/:id/unfollow', authenticateToken, (req, res) => {
    try {
        const stmt = db.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?');
        const result = stmt.run(req.user.id, req.params.id);

        if (result.changes === 0) {
            return res.status(404).json({ message: 'Not following' });
        }

        // Update counts
        db.prepare('UPDATE users SET followers_count = followers_count - 1 WHERE id = ?').run(req.params.id);
        db.prepare('UPDATE users SET following_count = following_count - 1 WHERE id = ?').run(req.user.id);

        res.json({ message: 'Unfollowed' });
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

// Check if following
app.get('/api/users/:id/is-following', authenticateToken, (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM follows WHERE follower_id = ? AND following_id = ?');
        const result = stmt.get(req.user.id, req.params.id);
        res.json({ isFollowing: !!result });
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

// --- NOTIFICATIONS ---

// Get user notifications
app.get('/api/notifications', authenticateToken, (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50');
        const notifications = stmt.all(req.user.id);
        res.json(notifications);
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

// Mark notification as read
app.put('/api/notifications/:id/read', authenticateToken, (req, res) => {
    try {
        const stmt = db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?');
        stmt.run(req.params.id, req.user.id);
        res.json({ message: 'Marked as read' });
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

// Delete notification
app.delete('/api/notifications/:id', authenticateToken, (req, res) => {
    try {
        const stmt = db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?');
        stmt.run(req.params.id, req.user.id);
        res.json({ message: 'Deleted' });
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

// --- GROUP POSTS ---

// Create group post
app.post('/api/groups/:id/posts', authenticateToken, (req, res) => {
    const { content } = req.body;

    if (!content) {
        return res.status(400).json({ message: 'Content is required' });
    }

    try {
        // Check if user is member
        const memberStmt = db.prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?');
        const isMember = memberStmt.get(req.params.id, req.user.id);

        if (!isMember) {
            return res.status(403).json({ message: 'Must be a member to post' });
        }

        const id = randomUUID();
        const stmt = db.prepare('INSERT INTO group_posts (id, group_id, user_id, content) VALUES (?, ?, ?, ?)');
        stmt.run(id, req.params.id, req.user.id, content);

        res.status(201).json({ id });
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});



// Delete group post
app.delete('/api/groups/:groupId/posts/:postId', authenticateToken, (req, res) => {
    try {
        const { groupId, postId } = req.params;
        const userId = req.user.id;

        // Check if post exists
        const postStmt = db.prepare('SELECT user_id FROM group_posts WHERE id = ? AND group_id = ?');
        const post = postStmt.get(postId, groupId);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Check if group creator
        const groupStmt = db.prepare('SELECT creator_id FROM groups WHERE id = ?');
        const group = groupStmt.get(groupId);

        // Allow if user is post author OR group creator
        if (post.user_id !== userId && (!group || group.creator_id !== userId)) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const deleteStmt = db.prepare('DELETE FROM group_posts WHERE id = ?');
        deleteStmt.run(postId);

        res.json({ message: 'Post deleted' });
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

// Get group posts
app.get('/api/groups/:id/posts', (req, res) => {
    try {
        const stmt = db.prepare(`
            SELECT gp.id, gp.content, gp.created_at, u.id as user_id, u.name, u.avatar
            FROM group_posts gp
            JOIN users u ON gp.user_id = u.id
            WHERE gp.group_id = ?
            ORDER BY gp.created_at DESC
            LIMIT 50
            `);
        const posts = stmt.all(req.params.id);

        // Get current user ID from token if available
        let currentUserId = null;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.substring(7);
                const decoded = jwt.verify(token, JWT_SECRET);
                currentUserId = decoded.id;
            } catch (e) {
                // Invalid token, continue without user context
            }
        }

        // For each post, check if current user has answered (if it's a quiz)
        const formatted = posts.map(p => {
            const basePost = {
                id: p.id,
                content: p.content,
                createdAt: p.created_at,
                user: { id: p.user_id, name: p.name, avatar: p.avatar }
            };

            // If user is authenticated and post is a quiz, check if they answered
            if (currentUserId) {
                try {
                    const parsed = JSON.parse(p.content);
                    if (parsed.type === 'quiz' && parsed.quiz) {
                        const answerStmt = db.prepare('SELECT option_index, is_correct FROM quiz_answers WHERE post_id = ? AND user_id = ?');
                        const answer = answerStmt.get(p.id, currentUserId);

                        if (answer) {
                            basePost.userAnswer = {
                                optionIndex: answer.option_index,
                                isCorrect: Boolean(answer.is_correct)
                            };
                        }
                    }
                } catch (e) {
                    // Not a quiz or invalid JSON, skip
                }
            }

            return basePost;
        });

        res.json(formatted);
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

// Answer a quiz question
app.post('/api/groups/:groupId/posts/:postId/answer', authenticateToken, (req, res) => {
    const { groupId, postId } = req.params;
    const { optionIndex } = req.body;
    const userId = req.user.id;

    if (optionIndex === undefined || optionIndex === null) {
        return res.status(400).json({ message: 'Option index is required' });
    }

    try {
        // Check if user already answered this quiz
        const checkStmt = db.prepare('SELECT * FROM quiz_answers WHERE post_id = ? AND user_id = ?');
        const existingAnswer = checkStmt.get(postId, userId);

        if (existingAnswer) {
            return res.status(400).json({ message: 'You have already answered this quiz' });
        }

        // Get the quiz post to check the correct answer
        const postStmt = db.prepare('SELECT content FROM group_posts WHERE id = ? AND group_id = ?');
        const post = postStmt.get(postId, groupId);

        if (!post) {
            return res.status(404).json({ message: 'Quiz not found' });
        }

        // Parse the quiz content
        let quizData;
        try {
            const parsed = JSON.parse(post.content);
            if (parsed.type === 'quiz' && parsed.quiz) {
                quizData = parsed.quiz;
            } else {
                return res.status(400).json({ message: 'Not a quiz post' });
            }
        } catch (e) {
            return res.status(400).json({ message: 'Invalid quiz data' });
        }

        // Check if answer is correct
        const isCorrect = optionIndex === quizData.correctIndex;

        // Record the answer
        const insertStmt = db.prepare('INSERT INTO quiz_answers (post_id, user_id, option_index, is_correct) VALUES (?, ?, ?, ?)');
        insertStmt.run(postId, userId, optionIndex, isCorrect ? 1 : 0);

        // If correct, award points
        if (isCorrect) {
            const updateStmt = db.prepare('UPDATE user_progress SET points = points + ? WHERE user_id = ?');
            updateStmt.run(quizData.points || 50, userId);
        }

        res.json({
            message: 'Answer recorded',
            isCorrect,
            points: isCorrect ? (quizData.points || 50) : 0
        });
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

// --- SEARCH ---



// Search groups
app.get('/api/search/users', (req, res) => {
    const { q } = req.query;

    if (!q) {
        return res.json([]);
    }

    try {
        const stmt = db.prepare('SELECT id, name, avatar, bio, followers_count FROM users WHERE name LIKE ? LIMIT 10');
        const users = stmt.all(`%${q}%`);

        // Check following status if authenticated
        let currentUserId = null;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.substring(7);
                const decoded = jwt.verify(token, JWT_SECRET);
                currentUserId = decoded.id;
            } catch (e) { }
        }

        if (currentUserId) {
            const followStmt = db.prepare('SELECT following_id FROM follows WHERE follower_id = ?');
            const following = new Set(followStmt.all(currentUserId).map(f => f.following_id));

            const result = users.map(u => ({
                ...u,
                isFollowing: following.has(u.id),
                isMe: u.id === currentUserId
            }));
            res.json(result);
        } else {
            res.json(users);
        }
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

app.get('/api/users/suggestions', authenticateToken, (req, res) => {
    try {
        // Simple suggestion logic: users I'm not following, ordered by random or followers count
        // Excluding myself
        const stmt = db.prepare(`
            SELECT u.id, u.name, u.avatar, u.bio, u.followers_count 
            FROM users u
            WHERE u.id != ? 
            AND u.id NOT IN (SELECT following_id FROM follows WHERE follower_id = ?)
            ORDER BY u.followers_count DESC, random()
            LIMIT 5
        `);

        const suggestions = stmt.all(req.user.id, req.user.id);
        res.json(suggestions);
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

app.get('/api/search/groups', (req, res) => {
    const { q } = req.query;

    if (!q) {
        return res.json([]);
    }

    try {
        const stmt = db.prepare(`
            SELECT g.id, g.name, g.description, COUNT(gm.user_id) as member_count
            FROM groups g
            LEFT JOIN group_members gm ON g.id = gm.group_id
            WHERE g.name LIKE ? OR g.description LIKE ?
            GROUP BY g.id
            LIMIT 10
            `);
        const groups = stmt.all(`% ${q}% `, ` % ${q}% `);
        res.json(groups);
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

// Export the app for Vercel
export default app;

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}
