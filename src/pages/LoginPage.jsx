import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Hexagon, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/LoginPage.css';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Security States
    const [honeypot, setHoneypot] = useState('');
    const [lockoutUntil, setLockoutUntil] = useState(null);

    // Check for existing lockout on mount
    useEffect(() => {
        const storedLockout = localStorage.getItem('loginLockoutUntil');
        if (storedLockout) {
            const lockoutTime = parseInt(storedLockout, 10);
            if (lockoutTime > Date.now()) {
                setLockoutUntil(lockoutTime);
            } else {
                localStorage.removeItem('loginLockoutUntil');
                localStorage.removeItem('loginAttempts');
            }
        }
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        // Check Honeypot (Bot Detection)
        if (honeypot) {
            console.warn("Bot detected via honeypot");
            setTimeout(() => {
                setError('ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
                setIsLoading(false);
            }, 1000);
            return;
        }

        setIsLoading(true);

        try {
            const result = await login(email, password);
            if (result.success) {
                navigate('/dashboard');
            } else {
                // Server handles brute-force counting and lockout
                setError(result.message);

                // If server says account is locked
                if (result.remainingAttempts !== undefined && result.remainingAttempts <= 0) {
                    setLockoutUntil(Date.now() + (5 * 60 * 1000));
                }
            }
        } catch (err) {
            setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-background">
                <div className="bg-shape shape-1"></div>
                <div className="bg-shape shape-2"></div>
            </div>

            <div className="glass-panel login-card">
                <div className="login-header">
                    <div className="logo-container">
                        <Hexagon size={40} className="logo-icon" />
                    </div>
                    <h1 className="text-gradient">Multiply System</h1>
                    <p className="text-muted">Log in</p>
                </div>

                {error && (
                    <div className="login-error-message">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="login-form">
                    <div className="input-group">
                        <User className="input-icon" size={20} />
                        <input
                            type="text"
                            placeholder="Username"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="input-group relative">
                        <Lock className="input-icon" size={20} />
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="password-toggle-btn"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    {/* Honeypot for Bots */}
                    <div className="honeypot-field" aria-hidden="true">
                        <input
                            type="text"
                            name="website_url_confirm"
                            tabIndex="-1"
                            value={honeypot}
                            onChange={(e) => setHoneypot(e.target.value)}
                            autoComplete="off"
                        />
                    </div>

                    <button
                        type="submit"
                        className={`btn-primary login-btn ${(isLoading || (lockoutUntil && lockoutUntil > Date.now())) ? 'btn-disabled-state' : ''}`}
                        disabled={isLoading || (lockoutUntil && lockoutUntil > Date.now())}
                    >
                        {isLoading ? (
                            <span className="loader">Initializing...</span>
                        ) : lockoutUntil && lockoutUntil > Date.now() ? (
                            "ระบบถูกระงับชั่วคราว"
                        ) : (
                            "เข้าสู่ระบบ"
                        )}
                    </button>
                </form>

                <div className="login-footer">
                    <span className="system-status">● System Operational</span>
                    <span className="version">v2.0.4</span>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
