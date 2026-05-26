async function run() {
  const params = new URLSearchParams({
    latitude: '5.82',
    longitude: '-73.03',
    radius: '50',
  });
  const res = await fetch(`http://localhost:3000/api/professionals/nearby?${params.toString()}`);
  if (!res.ok) {
    console.log(res.status, await res.text());
    return;
  }
  const data = await res.json();
  data.forEach((p: any) => {
    console.log(p.id, p.address);
  });
}

run().catch(console.error);
