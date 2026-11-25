import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../CreateQuickTaskModal', () => ({ CreateQuickTaskModal: () => null }));
vi.mock('../CreateQuickFollowUpModal', () => ({ CreateQuickFollowUpModal: () => null }));
vi.mock('@/lib/logger', () => ({ logger: { log: vi.fn() } }));

import { ChatComposer } from '../ChatComposer';
import { TooltipProvider } from '@/components/ui/tooltip';

beforeAll(() => { HTMLElement.prototype.scrollIntoView = vi.fn(); });
afterAll(() => { Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView'); });

describe('chat composer mentions', () => {
  it('selects a teammate with @ and sends the corresponding user identity', async () => {
    const onSend = vi.fn(async () => undefined);
    render(<TooltipProvider><ChatComposer onSend={onSend} members={[
      { id: 'teammate-id', full_name: 'Ana Silva', avatar_url: null },
    ]} /></TooltipProvider>);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '@Ana', selectionStart: 4 } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect((input as HTMLTextAreaElement).value).toBe('@Ana Silva '));
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(onSend).toHaveBeenCalledWith('@Ana Silva', undefined, ['teammate-id']));
  });
});