import { Page } from "puppeteer";
import { Selectors } from '../_constans'

/**
 * Whatsapp is very clever, but I don't stand behind.
 * Setting innertext by it-self does not trigger the page framework to see that
 * there is content to be sent. So... we need to trigger a change to the element
 * that is behaving like the input element.
 * 1 - Set the innerText with the message plus a letter
 * 2 - Click on the element
 * 3 - Trigger backspace into it
 * After 3, the framework responds on the keypress and updates the value to be sent
 * according to the div innerText. Done.
 * @param page 
 * @param message 
 */
export default async function injectMessage (page: Page, message: string): Promise<boolean> {
    const textareaSelector = Selectors.CHAT_MESSAGE_FIELD_SELECTOR

    let targetXPath = await page.evaluate((textareaSelector, message) => {
        const getXPathForElement = (element) => {
            const idx = (sib, name) => sib 
                ? idx(sib.previousElementSibling, name || sib.localName) + (sib.localName == name)
                : 1;
            const segs = elm => !elm || elm.nodeType !== 1 
                ? ['']
                : elm.id && document.querySelector(`#${elm.id}`) === elm
                    ? [`id("${elm.id}")`]
                    : [...segs(elm.parentNode), `${elm.localName.toLowerCase()}[${idx(elm, undefined)}]`];
            return segs(element).join('/');
        }
        let textareaElement = document.querySelector(textareaSelector)
        if (textareaElement === null) return Promise.resolve(false)
        textareaElement.innerText = message + '_'
        return Promise.resolve(getXPathForElement(textareaElement))
    }, textareaSelector, message)

    if (!targetXPath || targetXPath === '') {
        throw new Error('Could not inject message into chat field')
    }
    const targetElement: any = await page.$x(targetXPath)
    if (targetElement.length > 0) {
        await targetElement[0].click()
        await page.keyboard.press('Backspace')
        return true
    } else {
        throw new Error('Found target element but xPath is invalid.')
    }
} 