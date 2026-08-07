import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginPage } from '../src/pages/LoginPage';

describe('LoginPage', () => {
  it('llama a onSubmit con el email ingresado', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<LoginPage onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.click(screen.getByRole('button', { name: /ingresar/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('a@b.com', ''));
  });

  it('muestra un mensaje de error cuando onSubmit falla', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('falló'));
    render(<LoginPage onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.click(screen.getByRole('button', { name: /ingresar/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
