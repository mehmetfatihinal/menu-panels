import { promises as fs } from "fs";
import path from "path";
import type { Menu, Order } from "./types";

const dataDir = path.join(process.cwd(), "data");
const menuPath = path.join(dataDir, "menu.json");
const ordersPath = path.join(dataDir, "orders.json");

export async function readMenu(): Promise<Menu> {
  const raw = await fs.readFile(menuPath, "utf-8");
  return JSON.parse(raw) as Menu;
}

export async function writeMenu(menu: Menu): Promise<void> {
  await fs.writeFile(menuPath, JSON.stringify(menu, null, 2), "utf-8");
}

export async function readOrders(): Promise<Order[]> {
  const raw = await fs.readFile(ordersPath, "utf-8");
  return (JSON.parse(raw).orders ?? []) as Order[];
}

export async function writeOrders(orders: Order[]): Promise<void> {
  await fs.writeFile(ordersPath, JSON.stringify({ orders }, null, 2), "utf-8");
}
