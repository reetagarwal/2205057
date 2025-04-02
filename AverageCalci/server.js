const express = require('express');
const axios = require('axios');
const app = express();
const port = 9876;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const WINDOW_SIZE = 10;
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiZXhwIjoxNzQzNjAzNjk4LCJpYXQiOjE3NDM2MDMzOTgsImlzcyI6IkFmZm9yZG1lZCIsImp0aSI6IjU4NjViMGY3LWY0YTAtNDI2NS04NDhlLTljZTU2MTg1NTM4MCIsInN1YiI6IjIyMDUwNTdAa2lpdC5hYy5pbiJ9LCJlbWFpbCI6IjIyMDUwNTdAa2lpdC5hYy5pbiIsIm5hbWUiOiJyZWV0IGFnYXJ3YWwiLCJyb2xsTm8iOiIyMjA1MDU3IiwiYWNjZXNzQ29kZSI6Im53cHdyWiIsImNsaWVudElEIjoiNTg2NWIwZjctZjRhMC00MjY1LTg0OGUtOWNlNTYxODU1MzgwIiwiY2xpZW50U2VjcmV0IjoiZUtLamh5cXp6QUpha2Z3ZSJ9.dmVCfRP3AKCrVaoPlOagPrxjClRAkXtDo3Gp7An9Z2w";
const windowNumbers = new Set();

const API_ENDPOINTS = {
    prime: 'http://20.244.56.144/evaluation-service/primes',
    fibonacci: 'http://20.244.56.144/evaluation-service/fibo',
    even: 'http://20.244.56.144/evaluation-service/even',
    random: 'http://20.244.56.144/evaluation-service/rand'
};

const fetchNumbers = async (category) => {
    if (!API_ENDPOINTS[category]) {
        throw new Error('Invalid category');
    }
    try {
        const response = await axios.get(`${API_ENDPOINTS[category]}`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 500
        });
        return Array.isArray(response.data.numbers) ? response.data.numbers : [];
    } catch (error) {
        console.error(`Error fetching ${category} numbers:`, error.message);
        return [];
    }
};

const maintainWindow = (numbers) => {
    numbers.forEach(num => windowNumbers.add(num));
    while (windowNumbers.size > WINDOW_SIZE) {
        windowNumbers.delete([...windowNumbers][0]);
    }
};

const calculateAverage = () => {
    const numsArray = [...windowNumbers];
    return numsArray.length ? (numsArray.reduce((sum, num) => sum + num, 0) / numsArray.length).toFixed(2) : 0;
};

app.get('/numbers/:category', async (req, res) => {
    const { category } = req.params;

    try {
        const newNumbers = await fetchNumbers(category);
        if (newNumbers.length === 0) {
            return res.status(500).json({ error: 'Failed to retrieve numbers' });
        }

        const previousState = [...windowNumbers];
        maintainWindow(newNumbers);
        const currentState = [...windowNumbers];

        res.json({
            previousState,
            currentState,
            newNumbers,
            average: parseFloat(calculateAverage())
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});