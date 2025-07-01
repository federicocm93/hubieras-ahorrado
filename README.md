# Hubieras Ahorrado

Una aplicación moderna y minimalista para el seguimiento de finanzas personales construida con Next.js, TypeScript y Supabase.

## Características

- **Autenticación de Usuario**: Registro e inicio de sesión seguro con Supabase Auth
- **Gestión de Gastos**: Agregar, editar y eliminar gastos con facilidad
- **Gestión de Categorías**: Usar categorías predeterminadas o crear personalizadas
- **Análisis Visual**: Gráficos de gastos mensuales para rastrear patrones de gasto
- **Diseño Responsivo**: Interfaz limpia y minimalista que funciona en todos los dispositivos
- **Actualizaciones en Tiempo Real**: Los datos se sincronizan instantáneamente en todos los dispositivos

## Stack Tecnológico

- **Frontend**: Next.js 15, React, TypeScript
- **Estilos**: Tailwind CSS
- **Base de Datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **Gráficos**: Chart.js con react-chartjs-2
- **Iconos**: Lucide React

## Comenzar

### Prerrequisitos

- Node.js 18+ 
- Una cuenta y proyecto de Supabase

### Instalación

1. Clona el repositorio
2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Configura las variables de entorno:
   - Actualiza `.env.local` con tus credenciales de Supabase:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=tu_url_del_proyecto_supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon_supabase
   ```

4. Configura la base de datos:
   - Ve al panel de tu proyecto Supabase
   - Navega al Editor SQL
   - Ejecuta los comandos SQL de `supabase-schema-simple.sql`

5. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

6. Abre [http://localhost:3000](http://localhost:3000) en tu navegador

## Esquema de Base de Datos

La aplicación utiliza tres tablas principales:

- **categories**: Almacena categorías de gastos (tanto predeterminadas como creadas por el usuario)
- **expenses**: Almacena registros de gastos individuales
- **auth.users**: Tabla de autenticación de usuarios incorporada en Supabase

Row Level Security (RLS) está habilitado para asegurar que los usuarios solo puedan acceder a sus propios datos.

## Categorías Predeterminadas

Cuando un usuario se registra, las siguientes categorías predeterminadas se crean automáticamente:
- Comida y Restaurantes
- Transporte
- Compras
- Entretenimiento
- Facturas y Servicios
- Salud
- Educación
- Viajes
- Otros
