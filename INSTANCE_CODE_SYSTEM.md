# Sistema de Códigos para Desbloquear Instancias

## 📖 Descripción General

Este sistema permite bloquear instancias por código. Cada instancia puede tener un campo `InstanceCode` que actúa como una contraseña. Una vez que el usuario ingresa el código correcto, la instancia se desbloquea **permanentemente** en su cliente.

## 🔧 Configuración en PHP

Agrega el campo `InstanceCode` a cada instancia que desees bloquear:

```php
$instance['Test'] = array_merge($instance['Test'], array(
    "loadder" => array(
        "minecraft_version" => "1.20.1",
        "loadder_type" => "forge",
        "loadder_version" => "latest"
    ),
    "verify" => true,
    "ignored" => array(
        'config',
        'essential',
        'logs',
        'saves',
        'screenshots',
        'shaderpacks',
        'W-OVERFLOW',
        'options.txt',
        'optionsof.txt'
    ),
    "whitelist" => array(),
    "whitelistActive" => false,
    "status" => array(
        "nameServer" =>  "Test",
        "ip" => "51.222.11.99:25787",
        "port" => "25511"
    ),
    "backgroundUrl" => "http://172.96.172.240:1200/main/files/images/jaja.png",
    "avatarUrl"    => "http://172.96.172.240:1200/main/files/images/darken.png",
    "InstanceCode" => "Prueba"  // ← Agregar esta línea
));
```

## 📱 Cómo Funciona en el Cliente

### Comportamiento Visual

1. **Instancia Bloqueada**: Aparece en la lista de instancias con opacidad reducida y un ícono de candado 🔒
2. **Desbloqueo**: Al hacer clic en una instancia bloqueada, se abre un modal para ingresar el código
3. **Código Incorrecto**: Muestra mensaje de error
4. **Código Correcto**: La instancia se desbloquea y se selecciona automáticamente

### Almacenamiento Local

Una vez que el usuario ingresa el código correcto, se almacena en:
```
Database Local → "unlockedCodes" collection
{
    "Test": ["Prueba"],
    "OtraInstancia": ["Codigo123"]
}
```

**Nota**: Los códigos desbloqueados se guardan **permanentemente** en la BD local del usuario.

## 🖥️ Ubicación de Cambios

Los siguientes archivos fueron modificados:

### 1. **home.js** - Métodos Agregados
- `getUnlockedCodes()` - Obtiene códigos desbloqueados guardados
- `saveUnlockedCode()` - Guarda un código desbloqueado
- `isInstanceUnlockedByCode()` - Verifica si una instancia está desbloqueada
- `showCodeModal()` - Muestra el modal para ingresar código
- Modificaciones en `renderSidebarAvatars()` - Detecta y maneja instancias bloqueadas
- Modificaciones en `instancesSelect()` - Filtra instancias bloqueadas en el popup
- Modificaciones en event listeners - Maneja clics en instancias bloqueadas

### 2. **home.css** - Estilos Agregados
- `.code-modal` - Estilos del modal
- `.code-modal-content` - Contenedor del modal
- `.code-modal-header` - Encabezado del modal
- `.code-modal-body` - Cuerpo del modal
- `.code-input` - Campo de entrada
- `.code-modal-buttons` - Botones del modal
- `.code-modal-submit` / `.code-modal-cancel` - Estilos de botones
- `.locked-code-card` - Estilo de instancias bloqueadas en el popup
- `.instance-avatar.locked-by-code` - Estilo del avatar bloqueado

## 🔐 Flujo de Desbloqueo

```
Usuario hace clic en instancia bloqueada
         ↓
¿Tiene InstanceCode?
         ↓
¿Ya está desbloqueada localmente?
    SÍ → Se selecciona normalmente
    NO → Se abre modal
         ↓
Usuario ingresa código
         ↓
¿Código es correcto?
    SÍ → Se guarda localmente, se desbloquea y selecciona
    NO → Se muestra error, se puede reintentar
```

## ✨ Características

✅ Bloqueo por código por instancia  
✅ Almacenamiento local de códigos desbloqueados  
✅ Modal elegante para ingresar código  
✅ Mensajes de error claros  
✅ Soporte para enter en el campo de entrada  
✅ Indicador visual (candado 🔒)  
✅ Compatible con whitelist existente  
✅ Sin requerer servidor externo  

## 🔄 Combinación con Whitelist

Si una instancia tiene tanto `whitelistActive: true` como `InstanceCode`:
- Primero se valida la **whitelist** (acceso de usuario)
- Luego se valida el **código** (si pasa whitelist)

## 📝 Ejemplo Completo

```php
$instance['PremiumServer'] = array_merge($instance['PremiumServer'], array(
    "loadder" => array(
        "minecraft_version" => "1.20.1",
        "loadder_type" => "forge",
        "loadder_version" => "latest"
    ),
    "verify" => true,
    "ignored" => array('config', 'logs', 'saves'),
    "whitelist" => array(),
    "whitelistActive" => false,
    "status" => array(
        "nameServer" => "Premium Server",
        "ip" => "play.example.com:25565",
        "port" => "25565"
    ),
    "backgroundUrl" => "http://example.com/banner.png",
    "avatarUrl" => "http://example.com/avatar.png",
    "InstanceCode" => "PREMIUM2024"  // ← Código secreto
));
```

## 🐛 Solución de Problemas

**La instancia no aparece como bloqueada:**
- Verifica que `InstanceCode` esté en la respuesta del PHP
- Abre la consola (F12) y busca errores

**El código no se valida:**
- Asegúrate de que el código es **exacto** (mayúsculas/minúsculas cuentan)
- Verifica en la BD local (`unlockedCodes`) si se guardó

**El modal no aparece:**
- Verifica que el archivo CSS esté cargado
- Comprueba que no haya errores en la consola

## 📞 Preguntas Frecuentes

**P: ¿Puedo cambiar el código después?**
R: Sí, solo necesitas cambiar `InstanceCode` en tu PHP. Los usuarios deberán ingresarlo de nuevo.

**P: ¿Qué pasa si elimino `InstanceCode` del PHP?**
R: La instancia se desbloqueará automáticamente.

**P: ¿Los códigos se sincronizan entre dispositivos?**
R: No, se guardan **localmente** en cada cliente. Si el usuario cambia de dispositivo, deberá ingresar el código nuevamente.

**P: ¿Cómo reseto los códigos de un usuario?**
R: El usuario debe limpiar su BD local (generalmente al reinstalar el launcher).