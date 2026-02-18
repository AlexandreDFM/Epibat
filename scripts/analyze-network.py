#!/usr/bin/env python3
import sys, json
from collections import defaultdict

data = json.load(sys.stdin)["data"]
print(f'Found: {data["devicesFound"]}, Placed: {data["devicesPlaced"]}, APs: {data["accessPointsFound"]}')
print()

print("=== My device (isLocal) ===")
for d in data["devices"]:
    if d.get("isLocal"):
        print(f'  IP: {d["ip"]}, MAC: {d["mac"]}, Vendor: {d.get("vendor","?")}')
print()

print("=== Mist/Juniper APs ===")
for d in data.get("accessPoints", []):
    print(f'  IP: {d["ip"]}, MAC: {d["mac"]}, Vendor: {d.get("vendor","?")}')
if not data.get("accessPoints"):
    print("  (none detected)")
print()

print("=== All devices by subnet ===")
subnets = defaultdict(list)
for d in data["devices"]:
    parts = d["ip"].split(".")
    subnet = ".".join(parts[:3])
    subnets[subnet].append(d)

for subnet in sorted(subnets):
    devices = subnets[subnet]
    print(f"  {subnet}.* ({len(devices)} devices):")
    for d in devices:
        local = " [LOCAL]" if d.get("isLocal") else ""
        print(f'    {d["ip"]:18s} {d["mac"]:20s} {d.get("vendor","?"):15s}{local}')
