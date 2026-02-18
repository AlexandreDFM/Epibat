/**
 * File Name: check-local-ips.js
 * Author: Alexandre DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: Diagnostic script - lists local network interfaces and IP addresses.
 *
 * Copyright (c) 2026 Epitech
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the 'Software'), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
**/

const os = require('os');
const ifaces = os.networkInterfaces();
const ips = [];
for (const iface of Object.values(ifaces)) {
    if (!iface) continue;
    for (const info of iface) {
        if (info.family === 'IPv4' && !info.internal) {
            ips.push(`${info.address} (${info.mac})`);
        }
    }
}
console.log('Local IPv4 addresses:');
ips.forEach(ip => console.log(`  ${ip}`));
