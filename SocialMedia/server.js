const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 9876;

const API_BASE_URL = 'http://20.244.56.144/evaluation-service';
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiZXhwIjoxNzQzNjAzNjk4LCJpYXQiOjE3NDM2MDMzOTgsImlzcyI6IkFmZm9yZG1lZCIsImp0aSI6IjU4NjViMGY3LWY0YTAtNDI2NS04NDhlLTljZTU2MTg1NTM4MCIsInN1YiI6IjIyMDUwNTdAa2lpdC5hYy5pbiJ9LCJlbWFpbCI6IjIyMDUwNTdAa2lpdC5hYy5pbiIsIm5hbWUiOiJyZWV0IGFnYXJ3YWwiLCJyb2xsTm8iOiIyMjA1MDU3IiwiYWNjZXNzQ29kZSI6Im53cHdyWiIsImNsaWVudElEIjoiNTg2NWIwZjctZjRhMC00MjY1LTg0OGUtOWNlNTYxODU1MzgwIiwiY2xpZW50U2VjcmV0IjoiZUtLamh5cXp6QUpha2Z3ZSJ9.dmVCfRP3AKCrVaoPlOagPrxjClRAkXtDo3Gp7An9Z2w";

// Function to fetch data from an API endpoint
const fetchData = async (endpoint) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/${endpoint}`, {
            timeout: 500,
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error.message);
        return null;
    }
};

// GET /users - Get top users with the highest number of posts
app.get('/users', async (req, res) => {
    const usersData = await fetchData('users');
    if (!usersData || !usersData.users) {
        return res.status(500).json({ error: 'Failed to fetch user data' });
    }

    const userIds = Object.keys(usersData.users);

    // Fetch posts for all users in parallel
    const postsResponses = await Promise.all(userIds.map(userId => fetchData(`users/${userId}/posts`)));

    // Compute post counts
    const userPostCounts = userIds.reduce((acc, userId, index) => {
        const postsData = postsResponses[index];
        acc[userId] = postsData?.posts?.length || 0;
        return acc;
    }, {});

    // Get top 5 users with highest post count
    const sortedUsers = Object.entries(userPostCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([userId, postCount]) => ({
            id: userId,
            name: usersData.users[userId],
            postCount
        }));

    res.json({ topUsers: sortedUsers });
});

// GET /posts?type=popular or /posts?type=latest
app.get('/posts', async (req, res) => {
    const { type } = req.query;
    const usersData = await fetchData('users');

    if (!usersData || !usersData.users) {
        return res.status(500).json({ error: 'Failed to fetch users' });
    }

    const userIds = Object.keys(usersData.users);

    // Fetch all posts in parallel
    const postsResponses = await Promise.all(userIds.map(userId => fetchData(`users/${userId}/posts`)));
    let allPosts = postsResponses.flatMap(response => response?.posts || []);

    if (!allPosts.length) {
        return res.status(500).json({ error: 'No posts found' });
    }

    if (type === 'popular') {
        // Fetch comment counts in parallel
        const commentsResponses = await Promise.all(allPosts.map(post => fetchData(`posts/${post.id}/comments`)));

        // Calculate comment count for each post
        const postCommentCounts = allPosts.reduce((acc, post, index) => {
            acc[post.id] = commentsResponses[index]?.comments?.length || 0;
            return acc;
        }, {});

        const maxComments = Math.max(...Object.values(postCommentCounts), 0);
        const popularPosts = allPosts.filter(post => postCommentCounts[post.id] === maxComments);

        return res.json({ popularPosts });
    }

    if (type === 'latest') {
        return res.json({ latestPosts: allPosts.slice(-5) });
    }

    res.status(400).json({ error: 'Invalid type parameter' });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});