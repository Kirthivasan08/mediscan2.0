import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function OAuthSuccess() {
  const [params] = useSearchParams();
  const { loginWithOAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get('token');

    console.log("TOKEN:", token); // debug

    if (token) {
      loginWithOAuth(token)
        .then(() => {
          toast.success('Logged in successfully!');

          setTimeout(() => {
            navigate('/dashboard');
          }, 100);
        })
        .catch((err) => {
          console.error(err);
          toast.error('OAuth failed');
          navigate('/login');
        });
    } else {
      toast.error('No token found');
      navigate('/login');
    }
  }, [params, loginWithOAuth, navigate]);

  return (
    <div className="loading-screen">
      <div className="spinner" style={{ width: 48, height: 48 }} />
      <p>Completing sign-in…</p>
    </div>
  );
}