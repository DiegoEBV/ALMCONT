import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface AppNotification {
    id: string;
    title: string;
    message: string;
    type: NotificationType;
    read: boolean;
    createdAt: string;
    link?: string;
}

interface NotificationContextType {
    notifications: AppNotification[];
    unreadCount: number;
    addNotification: (notification: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearNotifications: () => void;
    removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotificationContext = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotificationContext must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);

    // Cargar notificaciones del localStorage al iniciar
    useEffect(() => {
        try {
            const storedNotifications = localStorage.getItem('app_notifications');
            if (storedNotifications) {
                setNotifications(JSON.parse(storedNotifications));
            } else {
                // Notificación de bienvenida inicial si está vacío
                setNotifications([
                    {
                        id: uuidv4(),
                        title: 'Bienvenido al Sistema',
                        message: 'Tu panel de notificaciones está listo.',
                        type: 'info',
                        read: false,
                        createdAt: new Date().toISOString()
                    }
                ]);
            }
        } catch (error) {
            console.error('Error loading notifications from localStorage', error);
        }
    }, []);

    // Guardar en localStorage cada vez que cambian
    useEffect(() => {
        try {
            localStorage.setItem('app_notifications', JSON.stringify(notifications));
        } catch (error) {
            console.error('Error saving notifications to localStorage', error);
        }
    }, [notifications]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const addNotification = useCallback((notification: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => {
        const newNotification: AppNotification = {
            ...notification,
            id: uuidv4(),
            read: false,
            createdAt: new Date().toISOString()
        };
        setNotifications(prev => [newNotification, ...prev]);
    }, []);

    const markAsRead = useCallback((id: string) => {
        setNotifications(prev => prev.map(n =>
            n.id === id ? { ...n, read: true } : n
        ));
    }, []);

    const markAllAsRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }, []);

    const clearNotifications = useCallback(() => {
        setNotifications([]);
    }, []);

    const removeNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            addNotification,
            markAsRead,
            markAllAsRead,
            clearNotifications,
            removeNotification
        }}>
            {children}
        </NotificationContext.Provider>
    );
};
