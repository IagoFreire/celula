import { useState, type FormEvent } from 'react';
import { api } from '../api';
import { KeyRound, Lock, Save, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (newPassword.length < 4) {
      setError('A nova senha deve ter pelo menos 4 caracteres');
      return;
    }

    try {
      setLoading(true);
      await api.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8 animate-fade-in">
        <h1 className="page-title flex items-center gap-2">
          <KeyRound className="w-6 h-6 text-gold-500" />
          Alterar Senha
        </h1>
        <p className="page-subtitle">Atualize sua senha de acesso</p>
      </div>

      <div className="card-gradient animate-fade-in-up">
        {success && (
          <div className="mb-6 flex items-center gap-3 p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <p className="text-sm text-emerald-400 font-medium">Senha alterada com sucesso!</p>
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-center gap-3 p-4 bg-red-500/10 rounded-xl border border-red-500/20">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400 font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-dark-400 mb-1.5">Senha Atual</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-500" />
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input-field pl-10"
                placeholder="Digite sua senha atual"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-400 mb-1.5">Nova Senha</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-500" />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-field pl-10"
                placeholder="Digite a nova senha"
                required
                minLength={4}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-400 mb-1.5">Confirmar Nova Senha</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-500" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field pl-10"
                placeholder="Confirme a nova senha"
                required
                minLength={4}
              />
            </div>
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-400 mt-1">As senhas não coincidem</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center"
          >
            {loading ? <div className="spinner w-4 h-4" /> : <Save className="w-4 h-4" />}
            Alterar Senha
          </button>
        </form>
      </div>
    </div>
  );
}
