import { test, expect } from '@playwright/test'

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display the page title and header', async ({ page }) => {
    await expect(page).toHaveTitle(/SDK/)
    await expect(page.locator('h1')).toContainText('OharaAI SDK Test')
    await expect(page.getByText('Deploy and test on-chain gaming contracts')).toBeVisible()
  })

  test('should display the game contracts section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Game Contracts/i })).toBeVisible()
  })

  test('should list all game contract types', async ({ page }) => {
    const contracts = ['Match', 'Score', 'Prize', 'Prediction', 'League', 'Tournament', 'Heap']
    for (const contract of contracts) {
      await expect(page.getByText(contract, { exact: true }).first()).toBeVisible()
    }
  })

  test('should display action buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Deploy|Redeploy/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Preview Plan/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Clear/ })).toBeVisible()
  })

  test('should toggle contract selection', async ({ page }) => {
    const scoreLabel = page.locator('label[for="Score"]')
    await expect(scoreLabel).toBeVisible()
    
    const scoreCheckbox = page.locator('#Score')
    const wasChecked = await scoreCheckbox.isChecked()
    await scoreLabel.click()
    
    if (wasChecked) {
      await expect(scoreCheckbox).not.toBeChecked()
    } else {
      await expect(scoreCheckbox).toBeChecked()
    }
  })

  test('should display contract descriptions', async ({ page }) => {
    await expect(page.getByText('Tracks player stats, match results, and leaderboards')).toBeVisible()
    await expect(page.getByText('Creates matches, holds escrowed stakes, and settles outcomes')).toBeVisible()
  })

  test('should have links to test pages', async ({ page }) => {
    const testLinks = page.getByText('Open test page')
    await expect(testLinks.first()).toBeVisible()
  })
})
