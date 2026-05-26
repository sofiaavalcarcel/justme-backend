async function testBooking() {
    const baseUrl = 'http://localhost:3000/api';
    const proId = 3; 
    
    console.log('--- Testing Booking Spatial Validation ---');
    
    // Diana is at 5.8168255, -73.0248455
    
    // 1. Test OUTSIDE radius (Bogotá)
    try {
        console.log('Testing Booking OUTSIDE radius...');
        const res = await fetch(`${baseUrl}/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                professionalId: proId,
                professionalServiceId: 1,
                date: '2026-03-15',
                startTime: '10:00',
                latitude: 4.711,
                longitude: -74.072,
                location: 'Calle Falsa 123',
                locationType: 'home'
            })
        });
        const data: any = await res.json();
        if (!res.ok) {
            console.log('Success: Booking rejected as expected.', data.message);
        } else {
            console.log('Failed: Booking should have been rejected!');
        }
    } catch (error: any) {
        console.error('Network Error:', error.message);
    }
}

testBooking();
