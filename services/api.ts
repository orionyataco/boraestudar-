import { supabase } from './supabaseClient';

export const api = {
    // Auth
    async register(name, email, password) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                }
            }
        });
        if (error) throw error;
        return { token: data.session?.access_token, user: data.user };
    },

    async login(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return { token: data.session?.access_token, user: data.user };
    },

    async getMe() {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw authError || new Error('Not authenticated');

        const { data, error } = await supabase
            .from('users')
            .select(`
                id, name, email, avatar, bio, followers_count, following_count
            `)
            .eq('id', user.id)
            .single();

        if (error) throw error;

        // Fetch progress separately or via join if table structure allows
        const { data: progress } = await supabase
            .from('user_progress')
            .select('hours, points, trend')
            .eq('user_id', user.id)
            .single();

        return { ...data, ...(progress || { hours: 0, points: 0, trend: 'neutral' }) };
    },

    async getCurrentUserId() {
        const { data: { user } } = await supabase.auth.getUser();
        return user?.id || null;
    },

    // Rankings
    async getRankings() {
        const { data, error } = await supabase
            .from('user_progress')
            .select(`
                hours, points, trend,
                users!user_progress_user_id_fkey (id, name, avatar)
            `)
            .order('points', { ascending: false });

        if (error) throw error;

        return data.map((item, index) => ({
            rank: index + 1,
            user: item.users,
            hours: item.hours,
            points: item.points,
            trend: item.trend
        }));
    },

    async updateProgress(hours, points) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase.rpc('increment_progress', {
            target_user_id: user.id,
            h_count: hours,
            p_count: points
        });

        if (error) {
            // Fallback if RPC fails
            const { data: current } = await supabase
                .from('user_progress')
                .select('hours, points')
                .eq('user_id', user.id)
                .single();

            const { error: updateError } = await supabase
                .from('user_progress')
                .update({
                    hours: (current?.hours || 0) + hours,
                    points: (current?.points || 0) + points
                })
                .eq('user_id', user.id);
            if (updateError) throw updateError;
        }
        return { message: 'Progress updated' };
    },

    // Posts
    async createPost(content, imageStart, imageEnd) {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
            .from('posts')
            .insert([{ user_id: user?.id, content, image_start: imageStart, image_end: imageEnd }])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async getPosts() {
        const { data: { user } } = await supabase.auth.getUser();

        const { data, error } = await supabase
            .from('posts')
            .select(`
                id, content, image_start, image_end, created_at,
                users!posts_user_id_fkey (id, name, avatar),
                post_likes (user_id),
                post_comments (
                    id, content, created_at,
                    users (id, name, avatar)
                )
            `)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        return data.map(p => {
            const likesCount = (p as any).post_likes?.length || 0;
            const likedByMe = (p as any).post_likes?.some((l: any) => l.user_id === user?.id) || false;

            return {
                ...p,
                imageStart: p.image_start,
                imageEnd: p.image_end,
                user: (p as any).users,
                likes: likesCount,
                likedBy: likedByMe ? ['me'] : [],
                comments: (p as any).post_comments?.length || 0,
                commentsList: (p as any).post_comments?.map((c: any) => ({
                    id: c.id,
                    user: c.users,
                    text: c.content,
                    timestamp: c.created_at
                })) || []
            };
        });
    },

    async deletePost(postId) {
        const { error } = await supabase
            .from('posts')
            .delete()
            .eq('id', postId);
        if (error) throw error;
        return { message: 'Post deleted' };
    },

    async editPost(postId, content) {
        const { error } = await supabase
            .from('posts')
            .update({ content })
            .eq('id', postId);
        if (error) throw error;
        return { message: 'Post updated' };
    },

    async toggleLike(postId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: existing } = await supabase
            .from('post_likes')
            .select()
            .eq('post_id', postId)
            .eq('user_id', user.id)
            .single();

        if (existing) {
            await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
            return { liked: false };
        } else {
            await supabase.from('post_likes').insert([{ post_id: postId, user_id: user.id }]);
            return { liked: true };
        }
    },

    async getLikes(postId) {
        const { count, error } = await supabase
            .from('post_likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', postId);
        if (error) throw error;
        return { count };
    },

    async getComments(postId) {
        const { data, error } = await supabase
            .from('post_comments')
            .select(`
                id, content, created_at,
                users (id, name, avatar)
            `)
            .eq('post_id', postId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data.map(c => ({
            ...c,
            user: c.users
        }));
    },

    async createComment(postId, content) {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
            .from('post_comments')
            .insert([{ post_id: postId, user_id: user?.id, content }])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteComment(commentId) {
        const { error } = await supabase.from('post_comments').delete().eq('id', commentId);
        if (error) throw error;
        return { message: 'Comment deleted' };
    },

    async editComment(commentId, content) {
        const { error } = await supabase.from('post_comments').update({ content }).eq('id', commentId);
        if (error) throw error;
        return { message: 'Comment updated' };
    },

    // Groups
    async createGroup(name, description, image, isPrivate) {
        const { data: { user } } = await supabase.auth.getUser();
        const inviteCode = Math.random().toString(36).substring(2, 10);

        const { data, error } = await supabase
            .from('groups')
            .insert([{
                name,
                description,
                image,
                creator_id: user?.id,
                is_private: isPrivate,
                invite_code: inviteCode
            }])
            .select()
            .single();

        if (error) throw error;

        // Auto join creator
        await supabase.from('group_members').insert([{ group_id: data.id, user_id: user?.id }]);

        return { ...data, inviteCode };
    },

    async updateGroup(groupId, name, description, image) {
        const { error } = await supabase
            .from('groups')
            .update({ name, description, image })
            .eq('id', groupId);
        if (error) throw error;
        return { message: 'Group updated' };
    },

    async deleteGroup(groupId) {
        const { error } = await supabase
            .from('groups')
            .delete()
            .eq('id', groupId);
        if (error) throw error;
        return { message: 'Group deleted' };
    },

    async getGroups() {
        const { data, error } = await supabase
            .from('groups')
            .select(`
                *,
                users!groups_creator_id_fkey (name),
                group_members (count)
            `)
            .eq('is_private', false)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data.map(g => ({
            ...g,
            creator_name: (g as any).users?.name,
            member_count: (g as any).group_members?.[0]?.count || 0
        }));
    },

    async getGroup(groupId) {
        const { data: { user } } = await supabase.auth.getUser();

        const { data: group, error } = await supabase
            .from('groups')
            .select(`
                *,
                users!groups_creator_id_fkey (name),
                group_members (user_id, joined_at, users (id, name, avatar, last_seen))
            `)
            .eq('id', groupId)
            .single();

        if (error) throw error;

        const members = group.group_members?.map(m => m.users) || [];
        const isMember = group.group_members?.some(m => m.user_id === user?.id) || false;
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const onlineCount = members.filter(m => m && m.last_seen > fiveMinutesAgo).length;

        if (isMember) {
            return { ...group, creator_name: (group as any).users?.name, members, onlineCount, isMember: true };
        } else {
            return {
                id: group.id,
                name: group.name,
                description: group.description,
                image: group.image,
                creator_id: group.creator_id,
                creator_name: (group as any).users?.name,
                member_count: members.length,
                is_private: group.is_private,
                isMember: false
            };
        }
    },

    async addMemberToGroup(groupId, userId) {
        const { error } = await supabase
            .from('group_members')
            .insert([{ group_id: groupId, user_id: userId }]);
        if (error) throw error;
        return { message: 'Member added' };
    },

    async joinGroupViaCode(code) {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: group, error } = await supabase
            .from('groups')
            .select('id')
            .eq('invite_code', code)
            .single();

        if (error || !group) throw new Error('Invalid invite code');

        const { error: joinError } = await supabase
            .from('group_members')
            .insert([{ group_id: group.id, user_id: user?.id }]);

        if (joinError && joinError.code !== '23505') throw joinError;

        return { message: 'Joined group', groupId: group.id };
    },

    async joinGroup(groupId) {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
            .from('group_members')
            .insert([{ group_id: groupId, user_id: user?.id }]);
        if (error) throw error;
        return { message: 'Joined group' };
    },

    async leaveGroup(groupId) {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
            .from('group_members')
            .delete()
            .eq('group_id', groupId)
            .eq('user_id', user?.id);
        if (error) throw error;
        return { message: 'Left group' };
    },

    async getMyGroups() {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
            .from('group_members')
            .select(`
                groups (
                    *,
                    users!groups_creator_id_fkey (name),
                    group_members (count)
                )
            `)
            .eq('user_id', user?.id);

        if (error) throw error;
        return data.map(item => ({
            ...item.groups,
            creator_name: (item.groups as any).users?.name,
            member_count: (item.groups as any).group_members?.[0]?.count || 0
        }));
    },

    // Profile & Account
    async updateProfile(name, bio, avatar) {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
            .from('users')
            .update({ name, bio, avatar })
            .eq('id', user?.id);
        if (error) throw error;
        return { message: 'Profile updated' };
    },

    async changePassword(currentPassword, newPassword) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        return { message: 'Password updated' };
    },

    async deleteAccount(password) {
        // Supabase doesn't allow users to delete themselves easily without a server-side function
        // For now, we'll sign them out. Ideally, use a postgres function.
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        return { message: 'Logged out. Account deletion requires administrative action.' };
    },

    // Group Posts & Quizzes
    async getGroupPosts(groupId) {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
            .from('group_posts')
            .select(`
                *,
                user:users!group_posts_user_id_fkey (id, name, avatar),
                quiz_answers (option_index, is_correct, user_id)
            `)
            .eq('group_id', groupId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data.map(p => {
            const answers = Array.isArray(p.quiz_answers) ? p.quiz_answers : [];
            const userAnswer = answers.find(a => a.user_id === user?.id);
            return {
                ...p,
                user: p.user, // Already aliased in select
                userAnswer: userAnswer ? {
                    optionIndex: userAnswer.option_index,
                    isCorrect: userAnswer.is_correct
                } : null
            };
        });
    },

    async createGroupPost(groupId, content) {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
            .from('group_posts')
            .insert([{ group_id: groupId, user_id: user?.id, content }])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteGroupPost(groupId, postId) {
        const { error } = await supabase.from('group_posts').delete().eq('id', postId);
        if (error) throw error;
        return { message: 'Post deleted' };
    },

    async answerQuiz(groupId, postId, optionIndex) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Get the post to check the correct answer
        const { data: post, error: postError } = await supabase
            .from('group_posts')
            .select('content')
            .eq('id', postId)
            .single();

        if (postError || !post) throw new Error('Post not found');

        let quizData;
        try {
            const parsed = JSON.parse(post.content);
            if (parsed.type === 'quiz' && parsed.quiz) {
                quizData = parsed.quiz;
            }
        } catch (e) {
            throw new Error('Invalid quiz format');
        }

        if (!quizData) throw new Error('Quiz data not found');

        const isCorrect = optionIndex === quizData.correctIndex;
        const points = isCorrect ? (quizData.points || 50) : 0;

        // Insert answer
        const { error: insertError } = await supabase
            .from('quiz_answers')
            .insert([{
                post_id: postId,
                user_id: user.id,
                option_index: optionIndex,
                is_correct: isCorrect
            }]);

        if (insertError) {
            if (insertError.code === '23505') {
                throw new Error('You have already answered this quiz');
            }
            throw insertError;
        }

        // Update score if correct
        if (isCorrect) {
            await this.updateProgress(0, points);
        }

        return { isCorrect, points };
    },

    // Social
    async searchUsers(query) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .ilike('name', `%${query}%`)
            .limit(20);
        if (error) throw error;
        return data;
    },

    async getSuggestedUsers() {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .neq('id', user?.id)
            .limit(5);
        if (error) throw error;
        return data;
    },

    async followUser(userId) {
        const { data: { user } } = await supabase.auth.getUser();

        // Check if already following
        const { data: existing } = await supabase
            .from('follows')
            .select('*')
            .eq('follower_id', user?.id)
            .eq('following_id', userId)
            .single();

        if (existing) return { message: 'Already following' };

        const { error } = await supabase
            .from('follows')
            .insert([{ follower_id: user?.id, following_id: userId }]);
        if (error) throw error;

        // Update following count for me
        const { data: me } = await supabase.from('users').select('following_count').eq('id', user?.id).single();
        await supabase.from('users').update({ following_count: (me?.following_count || 0) + 1 }).eq('id', user?.id);

        // Update followers count for them
        const { data: them } = await supabase.from('users').select('followers_count').eq('id', userId).single();
        await supabase.from('users').update({ followers_count: (them?.followers_count || 0) + 1 }).eq('id', userId);

        return { message: 'Followed' };
    },

    async unfollowUser(userId) {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
            .from('follows')
            .delete()
            .eq('follower_id', user?.id)
            .eq('following_id', userId);
        if (error) throw error;

        // Update following count for me
        const { data: me } = await supabase.from('users').select('following_count').eq('id', user?.id).single();
        if (me && me.following_count > 0) {
            await supabase.from('users').update({ following_count: me.following_count - 1 }).eq('id', user?.id);
        }

        // Update followers count for them
        const { data: them } = await supabase.from('users').select('followers_count').eq('id', userId).single();
        if (them && them.followers_count > 0) {
            await supabase.from('users').update({ followers_count: them.followers_count - 1 }).eq('id', userId);
        }

        return { message: 'Unfollowed' };
    },

    async resetStudyHours() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase
            .from('user_progress')
            .update({ hours: 0 })
            .eq('user_id', user.id);

        if (error) throw error;
        return { message: 'Study hours reset' };
    },

    async resetPoints() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase
            .from('user_progress')
            .update({ points: 0 })
            .eq('user_id', user.id);

        if (error) throw error;
        return { message: 'Points reset' };
    },
};
