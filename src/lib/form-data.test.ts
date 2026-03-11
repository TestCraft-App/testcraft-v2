import { describe, expect, it } from 'vitest';
import { detectFormFields, fillFormFields } from './form-data';

describe('form-data', () => {
    it('detects common form controls with labels', () => {
        document.body.innerHTML = `
            <form>
                <label for="email">Email</label>
                <input id="email" name="email" type="email" required />
                <label>Password <input name="password" type="password" /></label>
                <select id="country" name="country">
                    <option value="">Select...</option>
                    <option value="uy">Uruguay</option>
                </select>
            </form>
        `;

        const fields = detectFormFields(document);

        expect(fields).toHaveLength(3);
        expect(fields[0]).toMatchObject({ selector: '#email', label: 'Email', type: 'email', required: true });
        expect(fields[1]).toMatchObject({ name: 'password', type: 'password' });
        expect(fields[2]).toMatchObject({ selector: '#country', type: 'select' });
        expect(fields[2].options).toContain('uy');
    });

    it('excludes submit, button, reset, image, file, and hidden inputs', () => {
        document.body.innerHTML = `
            <form>
                <input id="name" name="name" type="text" />
                <input type="submit" value="Submit" />
                <input type="button" value="Click" />
                <input type="reset" value="Reset" />
                <input type="image" src="img.png" alt="Go" />
                <input type="file" name="upload" />
                <input type="hidden" name="csrf" value="tok123" />
            </form>
        `;

        const fields = detectFormFields(document);

        expect(fields).toHaveLength(1);
        expect(fields[0]).toMatchObject({ selector: '#name', type: 'text' });
    });

    it('fills text/select/checkbox fields and returns count', () => {
        document.body.innerHTML = `
            <input id="firstName" />
            <select id="role"><option value="admin">Admin</option></select>
            <input id="active" type="checkbox" />
        `;

        const count = fillFormFields(document, {
            '#firstName': 'Damian',
            '#role': 'admin',
            '#active': true,
        });

        expect(count).toBe(3);
        expect((document.querySelector('#firstName') as HTMLInputElement).value).toBe('Damian');
        expect((document.querySelector('#role') as HTMLSelectElement).value).toBe('admin');
        expect((document.querySelector('#active') as HTMLInputElement).checked).toBe(true);
    });

    it('skips file inputs and invalid selectors without crashing', () => {
        document.body.innerHTML = `
            <input id="name" />
            <input id="upload" type="file" />
        `;

        const count = fillFormFields(document, {
            '#name': 'Jane',
            '#upload': 'photo.png',
            '#nonexistent': 'ghost',
        });

        expect(count).toBe(1);
        expect((document.querySelector('#name') as HTMLInputElement).value).toBe('Jane');
    });
});
