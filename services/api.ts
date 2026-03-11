
const BASE_URL = 'http://localhost:3001/api';

async function request(path: string, options: RequestInit = {}) {
    const token = localStorage.getItem('auth_token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const response = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'An error occurred' }));
        throw new Error(error.message || response.statusText);
    }

    if (response.status === 204) return null;
    return response.json();
}

export const api = {
    // Auth
    async register(name, email, password) {
        const data = await request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password }),
        });
        if (data.token) localStorage.setItem('auth_token', data.token);
        return data;
    },

    async login(email, password) {
        const data = await request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        if (data.token) localStorage.setItem('auth_token', data.token);
        return data;
    },

    async getMe() {
        return request('/users/me');
    },

    async getCurrentUserId() {
        try {
            const user = await this.getMe();
            return user?.id || null;
        } catch {
            return null;
        }
    },

    // Rankings
    async getRankings() {
        const data = await request('/rankings');
        return (data || []).map((item, index) => ({
            rank: index + 1,
            user: { id: item.user_id, name: item.name, avatar: item.avatar },
            hours: item.hours,
            points: item.points,
            trend: item.trend
        }));
    },

    async updateProgress(hours: number, points: number) {
        return request('/users/progress', {
            method: 'POST',
            body: JSON.stringify({ hours, points }),
        });
    },

    // Posts
    async createPost(content, imageStart, imageEnd) {
        return request('/posts', {
            method: 'POST',
            body: JSON.stringify({ content, image_start: imageStart, image_end: imageEnd }),
        });
    },

    async getPosts() {
        const posts = await request('/posts');
        return (posts || []).map(p => ({
            ...p,
            likedBy: p.liked_by_me ? ['me'] : [],
        }));
    },

    async getFollowingPosts() {
        return this.getPosts(); // Fallback
    },

    async deletePost(postId) {
        return request(`/posts/${postId}`, { method: 'DELETE' });
    },

    async editPost(postId, content) {
        return request(`/posts/${postId}`, {
            method: 'PUT',
            body: JSON.stringify({ content }),
        });
    },

    async toggleLike(postId) {
        return request(`/posts/${postId}/like`, { method: 'POST' });
    },

    async getLikes(postId) {
        return request(`/posts/${postId}/likes`);
    },

    async getComments(postId) {
        return request(`/posts/${postId}/comments`);
    },

    async createComment(postId, content) {
        return request(`/posts/${postId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ content }),
        });
    },

    async deleteComment(commentId) {
        return request(`/comments/${commentId}`, { method: 'DELETE' });
    },

    async editComment(commentId, content) {
        return request(`/comments/${commentId}`, {
            method: 'PUT',
            body: JSON.stringify({ content }),
        });
    },

    // Groups
    async createGroup(name, description, image, isPrivate) {
        return request('/groups', {
            method: 'POST',
            body: JSON.stringify({ name, description, image, isPrivate }),
        });
    },

    async updateGroup(groupId, name, description, image) {
        return request(`/groups/${groupId}`, {
            method: 'PUT',
            body: JSON.stringify({ name, description, image }),
        });
    },

    async deleteGroup(groupId) {
        return request(`/groups/${groupId}`, { method: 'DELETE' });
    },

    async getGroups() {
        const groups = await request('/groups');
        return (groups || []).map(g => ({
            ...g,
            creator_name: g.creator_name,
            member_count: g.member_count || 0
        }));
    },

    async getGroup(groupId) {
        return request(`/groups/${groupId}`);
    },

    async addMemberToGroup(groupId, userId) {
        return request(`/groups/${groupId}/members`, {
            method: 'POST',
            body: JSON.stringify({ userId }),
        });
    },

    async joinGroupViaCode(code) {
        return request('/groups/join-code', {
            method: 'POST',
            body: JSON.stringify({ code }),
        });
    },

    async joinGroup(groupId) {
        return request(`/groups/${groupId}/join`, { method: 'POST' });
    },

    async leaveGroup(groupId) {
        return request(`/groups/${groupId}/leave`, { method: 'DELETE' });
    },

    async getMyGroups() {
        return request('/users/me/groups');
    },

    // Profile & Account
    async updateProfile(name, bio, avatar, username?, birthDate?, gender?) {
        return request('/users/profile', {
            method: 'PUT',
            body: JSON.stringify({ name, bio, avatar, username, birth_date: birthDate, gender }),
        });
    },

    async getUser(userId: string) {
        return request(`/users/me`); // Fallback for profile views
    },

    async isFollowing(targetUserId: string) {
        const data = await request(`/users/${targetUserId}/is-following`);
        return data?.isFollowing || false;
    },

    async changePassword(currentPassword, newPassword) {
        return request('/users/password', {
            method: 'PUT',
            body: JSON.stringify({ currentPassword, newPassword }),
        });
    },

    async deleteAccount(password) {
        return request('/users/account', {
            method: 'DELETE',
            body: JSON.stringify({ password }),
        });
    },

    // Group Posts & Quizzes
    async getGroupPosts(groupId) {
        return request(`/groups/${groupId}/posts`);
    },

    async createGroupPost(groupId, content) {
        return request(`/groups/${groupId}/posts`, {
            method: 'POST',
            body: JSON.stringify({ content }),
        });
    },

    async deleteGroupPost(groupId, postId) {
        return request(`/groups/${groupId}/posts/${postId}`, { method: 'DELETE' });
    },

    async answerQuiz(groupId, postId, optionIndex) {
        return request(`/groups/${groupId}/posts/${postId}/answer`, {
            method: 'POST',
            body: JSON.stringify({ optionIndex }),
        });
    },

    // Social
    async searchUsers(query) {
        return request(`/search/users?q=${encodeURIComponent(query)}`);
    },

    async getSuggestedUsers() {
        return request('/users/suggestions');
    },

    async getFollowingUsers() {
        return [];
    },

    async getFollowingCount(userId: string) {
        return 0;
    },

    async followUser(userId) {
        return request(`/users/${userId}/follow`, { method: 'POST' });
    },

    async unfollowUser(userId) {
        return request(`/users/${userId}/unfollow`, { method: 'DELETE' });
    },

    async resetStudyHours() {
        return request('/users/progress/reset-hours', { method: 'POST' });
    },

    async resetPoints() {
        return request('/users/progress/reset-points', { method: 'POST' });
    },

    async resetQuestionsCount() {
        return request('/users/progress/reset-questions', { method: 'POST' });
    },

    async resetAccuracy() {
        return request('/users/progress/reset-accuracy', { method: 'POST' });
    },

    // Admin
    admin: {
        async getStats() {
            const data = await request('/rankings');
            return {
                totalUsers: data.length,
                onlineUsers: data.filter((u: any) => u.status === 'online').length,
                totalPosts: 0,
                totalGroups: 0
            };
        },

        async getAllUsers() {
            return request('/rankings');
        },

        async getAllPosts() {
            return request('/posts');
        },

        async deletePost(postId: string) {
            return request(`/posts/${postId}`, { method: 'DELETE' });
        },

        async deleteUser(userId: string) {
            return request(`/users/${userId}`, { method: 'DELETE' });
        },

        async setUserRole(userId: string, role: string) {
            return request(`/users/${userId}/role`, {
                method: 'PUT',
                body: JSON.stringify({ role }),
            });
        },

        async getAllGroups() {
            return request('/groups');
        },

        async deleteGroup(groupId: string) {
            return request(`/groups/${groupId}`, { method: 'DELETE' });
        },
    },
};
