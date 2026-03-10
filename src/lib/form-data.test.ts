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
});
