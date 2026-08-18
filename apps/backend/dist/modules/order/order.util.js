export function addBusinessDays(start, days) {
    const d = new Date(start);
    let added = 0;
    while (added < days) {
        d.setDate(d.getDate() + 1);
        const dow = d.getUTCDay();
        if (dow !== 0 && dow !== 6)
            added++;
    }
    return d;
}
//# sourceMappingURL=order.util.js.map