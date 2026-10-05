// Definiciones de pasos asociando Cucumber a Playwright

import { Given, When, Then, Before, After } from '@cucumber/cucumber';
import { chromium, Browser, Page, expect } from '@playwright/test';

let browser: Browser;
let page: Page;

Before(async () => {
  // Se arranca un navegador antes de cada escenario BDD
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage();
});

Given('que el usuario accede a la pantalla principal de TravelWrap', async () => {
  await page.goto('http://localhost:5173');
});

When('rellena el formulario con título {string} y destino {string}', async (title: string, destination: string) => {
  await page.fill('input[name="title"]', title);
  await page.fill('input[name="destination"]', destination);
});

When('pulsa el botón {string}', async (buttonText: string) => {
  await page.click(`button:has-text("${buttonText}")`);
});

Then('el viaje {string} debe aparecer en la lista de viajes activos', async (title: string) => {
  const tripItem = page.locator(`text=${title}`);
  await expect(tripItem).toBeVisible();
});

After(async () => {
  // Se cierra el navegador al finalizar la prueba
  await browser.close();
});