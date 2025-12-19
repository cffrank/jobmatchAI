import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None
    
    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()
        
        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )
        
        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)
        
        # Open a new page in the browser context
        page = await context.new_page()
        
        # Navigate to your target URL and wait until the network request is committed
        await page.goto("http://localhost:5173", wait_until="commit", timeout=10000)
        
        # Wait for the main page to reach DOMContentLoaded state (optional for stability)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=3000)
        except async_api.Error:
            pass
        
        # Iterate through all iframes and wait for them to load as well
        for frame in page.frames:
            try:
                await frame.wait_for_load_state("domcontentloaded", timeout=3000)
            except async_api.Error:
                pass
        
        # Interact with the page elements to simulate user flow
        # -> Select a job from the job listing page to view detailed job information.
        frame = context.pages[-1]
        # Click on the 'Jobs' button to navigate to the job listing page
        elem = frame.locator('xpath=html/body/div/div/aside/nav/ul/li[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Select the first job 'Senior Product Manager' from TechFlow Inc by clicking its 'View Details' button to see detailed job information.
        frame = context.pages[-1]
        # Click 'View Details' button for the first job 'Senior Product Manager' to open detailed job information
        elem = frame.locator('xpath=html/body/div/div/main/div/div/div[2]/div/div[5]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # --> Assertions to verify final state
        frame = context.pages[-1]
        await expect(frame.locator('text=Senior Product Manager').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=TechFlow Inc').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=San Francisco, CA').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Hybrid').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=$140k - $180k').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=92% Excellent Match').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Posted February 10, 2024 • Apply by March 15, 2024').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Job Description').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Responsibilities: • Define and execute product roadmap for our flagship analytics product • Lead cross-functional teams of 10-15 engineers and designers • Conduct user research and translate insights into product requirements • Analyze metrics and make data-driven decisions • Present product vision to executive stakeholders').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Qualifications: • 5+ years of product management experience in B2B SaaS • Strong track record of launching successful products • Experience with agile development methodologies • Excellent communication and leadership skills • Technical background preferred').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Required Skills').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Product Strategy').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Cross-functional Leadership').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Agile Methodologies').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Data Analysis').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=SaaS').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Compatibility Analysis').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Skill Match').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=100%').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Experience Match').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=95%').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Industry Match').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=85%').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Location Match').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=90%').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Overall Match').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=92%').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=AI Recommendations').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Your profile is an excellent match for this role').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Your experience at Google and TechFlow aligns perfectly with their requirements').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Consider highlighting your AI product experience in your application').first).to_be_visible(timeout=30000)
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    