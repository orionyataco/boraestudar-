
const API_URL = 'http://localhost:3001/api';

async function testAuth() {
    console.log('Testing Registration...');
    const email = `test${Date.now()}@example.com`;
    const password = 'password123';
    const name = 'Test User';

    try {
        const registerRes = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
        });

        if (registerRes.status === 201) {
            console.log('Registration SUCCESS');
            const data = await registerRes.json();
            console.log('Token received:', !!data.token);
        } else {
            console.log('Registration FAILED', registerRes.status);
            const text = await registerRes.text();
            console.log('Response:', text);
        }
    } catch (e) {
        console.log('Registration ERROR', e.message);
    }

    console.log('\nTesting Login...');
    try {
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (loginRes.status === 200) {
            console.log('Login SUCCESS');
            const data = await loginRes.json();
            console.log('Token received:', !!data.token);
        } else {
            console.log('Login FAILED', loginRes.status);
            const text = await loginRes.text();
            console.log('Response:', text);
        }
    } catch (e) {
        console.log('Login ERROR', e.message);
    }
}

testAuth();
