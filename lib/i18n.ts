import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
    en: {
        translation: {
            profile: {
                title: 'Profile',
                tapToAddName: 'Tap to add name',
                firstName: 'First Name',
                lastName: 'Last Name',
                cancel: 'Cancel',
                save: 'Save',
            },
            preferences: {
                title: 'PREFERENCES',
                weeklyBudget: 'Weekly Budget',
                currency: 'Currency',
                language: 'Language',
                weeklyReports: 'Weekly Reports',
            },
            account: {
                title: 'ACCOUNT',
                privacySecurity: 'Privacy & Security',
                logOut: 'Log Out',
                logOutConfirm: 'Are you sure you want to log out?',
            },
            modals: {
                selectCurrency: 'Select Currency',
                selectLanguage: 'Select Language',
            },
            errors: {
                enterName: 'Please enter your name.',
                invalidNumber: 'Please enter a valid number.',
                generic: 'Error',
            },
        },
    },
    es: {
        translation: {
            profile: {
                title: 'Perfil',
                tapToAddName: 'Toca para agregar nombre',
                firstName: 'Nombre',
                lastName: 'Apellido',
                cancel: 'Cancelar',
                save: 'Guardar',
            },
            preferences: {
                title: 'PREFERENCIAS',
                weeklyBudget: 'Presupuesto Semanal',
                currency: 'Moneda',
                language: 'Idioma',
                weeklyReports: 'Reportes Semanales',
            },
            account: {
                title: 'CUENTA',
                privacySecurity: 'Privacidad y Seguridad',
                logOut: 'Cerrar Sesión',
                logOutConfirm: '¿Estás seguro de que quieres cerrar sesión?',
            },
            modals: {
                selectCurrency: 'Seleccionar Moneda',
                selectLanguage: 'Seleccionar Idioma',
            },
            errors: {
                enterName: 'Por favor ingresa tu nombre.',
                invalidNumber: 'Por favor ingresa un número válido.',
                generic: 'Error',
            },
        },
    },
    pt: {
        translation: {
            profile: {
                title: 'Perfil',
                tapToAddName: 'Toque para adicionar nome',
                firstName: 'Nome',
                lastName: 'Sobrenome',
                cancel: 'Cancelar',
                save: 'Salvar',
            },
            preferences: {
                title: 'PREFERÊNCIAS',
                weeklyBudget: 'Orçamento Semanal',
                currency: 'Moeda',
                language: 'Idioma',
                weeklyReports: 'Relatórios Semanais',
            },
            account: {
                title: 'CONTA',
                privacySecurity: 'Privacidade e Segurança',
                logOut: 'Sair',
                logOutConfirm: 'Tem certeza de que deseja sair?',
            },
            modals: {
                selectCurrency: 'Selecionar Moeda',
                selectLanguage: 'Selecionar Idioma',
            },
            errors: {
                enterName: 'Por favor, insira seu nome.',
                invalidNumber: 'Por favor, insira um número válido.',
                generic: 'Erro',
            },
        },
    },
};

i18n.use(initReactI18next).init({
    resources,
    lng: 'es',
    fallbackLng: 'es',
    interpolation: {
        escapeValue: false,
    },
    compatibilityJSON: 'v4',
});

export default i18n;
