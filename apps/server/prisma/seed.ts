/**
 * File Name: seed.ts
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: Database seed script - populates buildings, floors, and initial data.
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

import { PrismaClient, RoomType } from "@prisma/client";

const prisma = new PrismaClient();

async function seed() {
  console.log("🌱 Seeding database...");

  // ── Building ────────────────────────────────────────────────────────────
  const building = await prisma.building.upsert({
    where: { name: "Epitech Nice" },
    update: {},
    create: {
      name: "Epitech Nice",
      address: "1 Pl. Masséna, 06000 Nice",
    },
  });

  // ── Floors ──────────────────────────────────────────────────────────────
  const floors = [
    { level: 0, name: "Rez-de-chaussée" },
    { level: 1, name: "1er étage" },
    { level: 2, name: "2ème étage" },
    { level: 3, name: "3ème étage" },
    { level: 4, name: "4ème étage" },
    { level: 5, name: "5ème étage" },
    { level: 6, name: "6ème étage (fermé)" },
  ];

  const createdFloors: Record<number, string> = {};

  for (const floor of floors) {
    const f = await prisma.floor.upsert({
      where: {
        buildingId_level: {
          buildingId: building.id,
          level: floor.level,
        },
      },
      update: { name: floor.name },
      create: {
        buildingId: building.id,
        level: floor.level,
        name: floor.name,
      },
    });
    createdFloors[floor.level] = f.id;
  }

  // ── Rooms (sample for floor 0 and 1) ───────────────────────────────────
  const rooms = [
    // RDC
    {
      floorId: createdFloors[0],
      name: "Hall d'entrée",
      type: "hallway" as RoomType,
      capacity: 50,
      polygon: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 8 },
        { x: 0, y: 8 },
      ],
    },
    {
      floorId: createdFloors[0],
      name: "Salle B01",
      type: "classroom" as RoomType,
      capacity: 30,
      polygon: [
        { x: 12, y: 0 },
        { x: 20, y: 0 },
        { x: 20, y: 8 },
        { x: 12, y: 8 },
      ],
    },
    {
      floorId: createdFloors[0],
      name: "Salle B02",
      type: "lab" as RoomType,
      capacity: 25,
      polygon: [
        { x: 22, y: 0 },
        { x: 30, y: 0 },
        { x: 30, y: 8 },
        { x: 22, y: 8 },
      ],
    },
    // 1er étage
    {
      floorId: createdFloors[1],
      name: "Open Space",
      type: "open_space" as RoomType,
      capacity: 80,
      polygon: [
        { x: 0, y: 0 },
        { x: 15, y: 0 },
        { x: 15, y: 12 },
        { x: 0, y: 12 },
      ],
    },
    {
      floorId: createdFloors[1],
      name: "Salle 101",
      type: "classroom" as RoomType,
      capacity: 30,
      polygon: [
        { x: 17, y: 0 },
        { x: 25, y: 0 },
        { x: 25, y: 8 },
        { x: 17, y: 8 },
      ],
    },
    {
      floorId: createdFloors[1],
      name: "Salle 102",
      type: "meeting" as RoomType,
      capacity: 10,
      polygon: [
        { x: 17, y: 10 },
        { x: 25, y: 10 },
        { x: 25, y: 16 },
        { x: 17, y: 16 },
      ],
    },
    // 2ème étage
    {
      floorId: createdFloors[2],
      name: "Salle 201",
      type: "classroom" as RoomType,
      capacity: 30,
      polygon: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 8 },
        { x: 0, y: 8 },
      ],
    },
    {
      floorId: createdFloors[2],
      name: "Salle 202",
      type: "lab" as RoomType,
      capacity: 25,
      polygon: [
        { x: 12, y: 0 },
        { x: 22, y: 0 },
        { x: 22, y: 8 },
        { x: 12, y: 8 },
      ],
    },
    // 3ème étage
    {
      floorId: createdFloors[3],
      name: "Salle 301",
      type: "classroom" as RoomType,
      capacity: 30,
      polygon: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 8 },
        { x: 0, y: 8 },
      ],
    },
    {
      floorId: createdFloors[3],
      name: "Salle 302",
      type: "classroom" as RoomType,
      capacity: 30,
      polygon: [
        { x: 12, y: 0 },
        { x: 22, y: 0 },
        { x: 22, y: 8 },
        { x: 12, y: 8 },
      ],
    },
    // 4ème étage
    {
      floorId: createdFloors[4],
      name: "Salle 401",
      type: "classroom" as RoomType,
      capacity: 30,
      polygon: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 8 },
        { x: 0, y: 8 },
      ],
    },
    {
      floorId: createdFloors[4],
      name: "Salle 402",
      type: "lab" as RoomType,
      capacity: 25,
      polygon: [
        { x: 12, y: 0 },
        { x: 22, y: 0 },
        { x: 22, y: 8 },
        { x: 12, y: 8 },
      ],
    },
    // 5ème étage
    {
      floorId: createdFloors[5],
      name: "Salle 501",
      type: "classroom" as RoomType,
      capacity: 30,
      polygon: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 8 },
        { x: 0, y: 8 },
      ],
    },
    {
      floorId: createdFloors[5],
      name: "Salle 502",
      type: "lab" as RoomType,
      capacity: 25,
      polygon: [
        { x: 12, y: 0 },
        { x: 22, y: 0 },
        { x: 22, y: 8 },
        { x: 12, y: 8 },
      ],
    },
  ];

  for (const room of rooms) {
    await prisma.room.upsert({
      where: {
        floorId_name: {
          floorId: room.floorId,
          name: room.name,
        },
      },
      update: {},
      create: {
        floorId: room.floorId,
        name: room.name,
        type: room.type,
        capacity: room.capacity,
        polygon: room.polygon,
      },
    });
  }

  console.log("✅ Seed complete");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
