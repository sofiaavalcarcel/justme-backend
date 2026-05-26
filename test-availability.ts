async function testAvailability() {
    const baseUrl = 'http://localhost:3000/api';
    const proId = 3; // Diana
    const date = '2026-03-15'; 
    
    console.log('--- Testing Availability Flow ---');
    
    // Diana is at 5.8168255, -73.0248455 with 10km radius
    
    // 1. Test location INSIDE radius (same spot)
    try {
        console.log('Testing INSIDE radius...');
        const url = `${baseUrl}/schedule/${proId}/available-slots?date=${date}&latitude=5.816&longitude=-73.024`;
        const res = await fetch(url);
        const data: any = await res.json();
        if (res.ok) {
            console.log('Success: Slots retrieved.', data.slots?.length || 0, 'slots found.');
        } else {
            console.error('Failed inside radius:', data);
        }
    } catch (error: any) {
        console.error('Network Error:', error.message);
    }

    // 2. Test location OUTSIDE radius (Bogotá)
    try {
        console.log('\nTesting OUTSIDE radius...');
        const url = `${baseUrl}/schedule/${proId}/available-slots?date=${date}&latitude=4.711&longitude=-74.072`;
        const res = await fetch(url);
        const data: any = await res.json();
        if (!res.ok) {
            console.log('Success: Request rejected as expected.', data.message);
        } else {
            console.log('Failed: Request should have been rejected!');
        }
    } catch (error: any) {
        console.error('Network Error:', error.message);
    }
}

testAvailability();
