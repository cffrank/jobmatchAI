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
        # -> Input email and password, then click Sign In button to authenticate.
        frame = context.pages[-1]
        # Input email address for login
        elem = frame.locator('xpath=html/body/div/div/div/div[2]/form/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('test1@jobmatch.ai')
        

        frame = context.pages[-1]
        # Input password for login
        elem = frame.locator('xpath=html/body/div/div/div/div[2]/form/div[2]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('TestPassword123!')
        

        frame = context.pages[-1]
        # Click Sign In button to submit login form
        elem = frame.locator('xpath=html/body/div/div/div/div[2]/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click 'View Resume' button to preview the resume.
        frame = context.pages[-1]
        # Click 'View Resume' button to preview the resume
        elem = frame.locator('xpath=html/body/div/div/main/div/div/div[2]/div/div[2]/div/div[2]/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click 'Download as PDF' button to download the resume in PDF format.
        frame = context.pages[-1]
        # Click 'Download as PDF' button to download the resume in PDF format
        elem = frame.locator('xpath=html/body/div/div/main/div/div/div/div[2]/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click 'Download as PDF' button to trigger the PDF download and verify the file.
        frame = context.pages[-1]
        # Click 'Download as PDF' button to download the resume in PDF format
        elem = frame.locator('xpath=html/body/div/div/main/div/div/div/div[2]/div/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click 'Download as DOCX' button to download the resume in DOCX format and verify the file.
        frame = context.pages[-1]
        # Click 'Download as DOCX' button to download the resume in DOCX format
        elem = frame.locator('xpath=html/body/div/div/main/div/div/div/div[2]/div/div/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # --> Assertions to verify final state
        frame = context.pages[-1]
        await expect(frame.locator('text=Sarah Chen').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Senior Product Manager').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=sarah.chen@email.com').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=+1 (555) 234-5678').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=San Francisco, CA').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=linkedin.com/in/sarahchen').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Results-driven product manager with 8+ years of experience launching and scaling B2B SaaS products. Passionate about leveraging AI to solve complex user problems. Led products from 0 to $10M ARR at high-growth startups. Strong cross-functional leader with expertise in product strategy, roadmapping, and data-driven decision making.').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Senior Product Manager').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=TechFlow Inc').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Mar 2021 - Present').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Lead product strategy and execution for AI-powered analytics platform serving 500+ enterprise customers.').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Launched AI-driven insights feature that increased user engagement by 45% and drove $3M in new revenue.').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Led cross-functional team of 12 engineers, designers, and data scientists through complete product redesign.').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Established data-driven product development process, reducing time-to-market by 30%.').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Grew product from $2M to $10M ARR in 2 years through strategic feature prioritization.').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Product Manager').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Google').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Jun 2018 - Feb 2021').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Managed cloud infrastructure products for Google Cloud Platform, focusing on developer tools and automation.').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Shipped 3 major features for Cloud Build that increased customer adoption by 60%.').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Collaborated with engineering teams across 4 countries to deliver seamless CI/CD experience.').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Conducted 100+ user interviews to inform product roadmap and feature prioritization.').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Presented product vision and quarterly updates to VP-level stakeholders.').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Associate Product Manager').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=StartupLab').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Aug 2016 - May 2018').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=First product hire at early-stage B2B SaaS startup. Built product from concept to 50 paying customers.').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Defined product vision and roadmap for project management tool targeting creative agencies.').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Conducted market research and competitive analysis to identify product-market fit.').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Launched MVP in 4 months with limited engineering resources.').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Gathered continuous customer feedback through weekly user testing sessions.').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Master of Science in Computer Science').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Stanford University').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Sep 2014 - Jun 2016').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=GPA: 3.8').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Concentration in Human-Computer Interaction').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Teaching Assistant for CS147: Introduction to HCI').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Published research on AI-driven user interfaces').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Bachelor of Arts in Cognitive Science').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=University of California, Berkeley').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Aug 2010 - May 2014').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=GPA: 3.7').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Minor in Computer Science').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Dean's List all 4 years').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=President of Product Management Club').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Product Strategy').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Product Management').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Roadmapping').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=User Research').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Data Analysis').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=A/B Testing').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=SQL').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Agile Methodologies').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Cross-functional Leadership').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Product Analytics').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=SaaS').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=AI/Machine Learning').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Download as PDF').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Download as DOCX').first).to_be_visible(timeout=30000)
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    