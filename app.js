                // ==========================================
                // LOGGER & DIAGNOSTIC SYSTEM
                // ==========================================
                const Logger = {
                        styles: {
                                error: 'background: #F44336; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold; font-family: monospace;',
                                warn: 'background: #FF9800; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold; font-family: monospace;',
                                info: 'background: #2196F3; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold; font-family: monospace;',
                                success: 'background: #4CAF50; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold; font-family: monospace;',
                                system: 'background: #795548; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold; font-family: monospace;'
                        },

                        log(level, message, details = null) {
                                const timestamp = new Date().toLocaleTimeString();
                                const style = this.styles[level] || this.styles.system;

                                console.groupCollapsed(`%c${level.toUpperCase()}%c [${timestamp}] ${message}`, style, 'color: inherit; font-weight: normal;');
                                if (details) {
                                        console.log('Detalhes:', details);
                                }
                                console.log('Stack Trace:', new Error().stack);
                                console.groupEnd();

                                this.saveToCache({ level, message, details, timestamp });
                        },

                        saveToCache(entry) {
                                try {
                                        let logs = JSON.parse(sessionStorage.getItem('site_logs') || '[]');
                                        logs.push(entry);
                                        if (logs.length > 50) logs.shift(); // Max 50 logs
                                        sessionStorage.setItem('site_logs', JSON.stringify(logs));

                                        if (typeof refreshDiagnosticPanel === 'function') {
                                                refreshDiagnosticPanel();
                                        }
                                } catch (e) {
                                        // Ignore storage error
                                }
                        },

                        error(message, details = null) {
                                this.log('error', message, details);
                        },

                        warn(message, details = null) {
                                this.log('warn', message, details);
                        },

                        info(message, details = null) {
                                this.log('info', message, details);
                        },

                        success(message, details = null) {
                                this.log('success', message, details);
                        }
                };

                // Catch uncaught script errors
                window.addEventListener('error', (event) => {
                        const filename = event.filename || '';
                        const isExtension = filename.includes('chrome-extension://') || filename.includes('moz-extension://') || !filename;
                        const message = event.message || 'Erro de script desconhecido';

                        const details = {
                                url: event.filename,
                                linha: event.lineno,
                                coluna: event.coleno,
                                tipo: event.type,
                                origem: isExtension ? 'ExtensÃ£o do Navegador / Script Externo' : 'CÃ³digo Nativo do Site',
                                stack: event.error ? event.error.stack : null
                        };

                        if (isExtension) {
                                Logger.warn(`[ExtensÃ£o/Script Externo] ${message}`, details);
                        } else {
                                Logger.error(`[Erro de CÃ³digo] ${message}`, details);
                        }
                });

                // Catch uncaught Promise rejections
                window.addEventListener('unhandledrejection', (event) => {
                        const reason = event.reason;
                        const details = {
                                mensagem: reason instanceof Error ? reason.message : reason,
                                stack: reason instanceof Error ? reason.stack : null
                        };
                        Logger.error('Promessa rejeitada nÃ£o tratada (Promise Rejection)', details);
                });

                // Diagnostic Panel UI Implementation
                function openDiagnosticPanel() {
                        let panel = document.getElementById('diagnostic-panel');
                        if (panel) return;

                        panel = document.createElement('div');
                        panel.id = 'diagnostic-panel';
                        panel.className = 'fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-typewriter';

                        panel.innerHTML = `
                                <div class="bg-surface border border-outline-variant rounded-lg max-w-3xl w-full max-h-[85vh] shadow-2xl flex flex-col relative overflow-hidden text-on-surface notebook-paper">
                                        <div class="tape top-0"></div>
                                        <div class="p-6 border-b border-outline-variant/30 flex justify-between items-center mt-4">
                                                <div>
                                                        <h3 class="font-handwritten text-3xl text-primary mb-1">Painel de DiagnÃ³stico</h3>
                                                        <p class="text-xs text-on-surface-variant">Monitore logs, erros de rede e integridade local</p>
                                                </div>
                                                <button onclick="closeDiagnosticPanel()" class="text-on-surface-variant hover:text-primary transition-colors p-2">
                                                        <span class="material-symbols-outlined text-2xl">close</span>
                                                </button>
                                        </div>
                                        
                                        <div class="p-6 overflow-y-auto flex-grow space-y-6 text-sm">
                                                <!-- System Info -->
                                                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-outline-variant/20 pb-4">
                                                        <div class="bg-surface-container-low p-3 rounded border border-outline-variant/10 text-left">
                                                                <span class="text-xs text-on-surface-variant block uppercase tracking-wider">Status de ConexÃ£o</span>
                                                                <span class="font-bold flex items-center gap-2 mt-1">
                                                                        <span class="w-3 h-3 rounded-full ${navigator.onLine ? 'bg-green-500' : 'bg-red-500'}"></span>
                                                                        ${navigator.onLine ? 'Conectado (Online)' : 'Desconectado (Offline)'}
                                                                </span>
                                                        </div>
                                                        <div class="bg-surface-container-low p-3 rounded border border-outline-variant/10 text-left">
                                                                <span class="text-xs text-on-surface-variant block uppercase tracking-wider">Backup Local (SubmissÃµes)</span>
                                                                <span id="diagnostic-backup-count" class="font-bold block mt-1">Carregando...</span>
                                                        </div>
                                                        <div class="bg-surface-container-low p-3 rounded border border-outline-variant/10 text-left">
                                                                <span class="text-xs text-on-surface-variant block uppercase tracking-wider">Dispositivo / ResoluÃ§Ã£o</span>
                                                                <span class="text-xs font-bold block mt-1 truncate">${navigator.userAgent.split(' ').slice(-2).join(' ')} (${window.innerWidth}x${window.innerHeight})</span>
                                                        </div>
                                                </div>

                                                <!-- Log Lists -->
                                                <div>
                                                        <div class="flex justify-between items-center mb-3">
                                                                <h4 class="font-bold uppercase tracking-wider text-xs text-primary">Logs Recentes do Sistema</h4>
                                                                <div class="flex gap-2">
                                                                        <button onclick="clearDiagnosticLogs()" class="text-xs border border-outline-variant/30 hover:bg-surface-variant px-3 py-1 rounded transition-all">Limpar Logs</button>
                                                                        <button onclick="copyDiagnosticLogs()" class="text-xs bg-primary text-on-primary hover:opacity-90 px-3 py-1 rounded transition-all shadow-sm">Copiar Tudo</button>
                                                                </div>
                                                        </div>
                                                        <div id="diagnostic-logs-container" class="bg-surface-container-lowest border border-outline-variant/20 rounded p-3 font-mono text-xs max-h-[40vh] overflow-y-auto space-y-2 select-text">
                                                                <!-- Logs dynamically injected -->
                                                        </div>
                                                </div>
                                        </div>
                                </div>
                        `;

                        document.body.appendChild(panel);
                        refreshDiagnosticPanel();
                }

                function closeDiagnosticPanel() {
                        const panel = document.getElementById('diagnostic-panel');
                        if (panel) panel.remove();
                }

                function refreshDiagnosticPanel() {
                        const container = document.getElementById('diagnostic-logs-container');
                        const backupCount = document.getElementById('diagnostic-backup-count');
                        if (!container) return;

                        // 1. Get backup count
                        try {
                                const saved = localStorage.getItem('waitlist_submissions');
                                const count = saved ? JSON.parse(saved).length : 0;
                                backupCount.textContent = `${count} lead(s) salvo(s)`;
                        } catch (e) {
                                backupCount.textContent = 'Erro ao ler';
                        }

                        // 2. Load logs
                        try {
                                const logs = JSON.parse(sessionStorage.getItem('site_logs') || '[]');
                                if (logs.length === 0) {
                                        container.innerHTML = '<div class="text-on-surface-variant italic text-center py-4">Nenhum log registrado ainda. Envie o formulÃ¡rio ou pressione Ctrl+Shift+D para reabrir este painel.</div>';
                                        return;
                                }

                                container.innerHTML = logs.map(log => {
                                        let colorClass = 'text-blue-500';
                                        let bgClass = 'bg-blue-500/10 border-blue-500/20';
                                        if (log.level === 'error') {
                                                colorClass = 'text-red-500 font-bold';
                                                bgClass = 'bg-red-500/10 border-red-500/20';
                                        } else if (log.level === 'warn') {
                                                colorClass = 'text-yellow-600 font-bold';
                                                bgClass = 'bg-yellow-500/10 border-yellow-500/20';
                                        } else if (log.level === 'success') {
                                                colorClass = 'text-green-600 font-bold';
                                                bgClass = 'bg-green-500/10 border-green-500/20';
                                        }

                                        let detailsStr = '';
                                        if (log.details) {
                                                detailsStr = `<pre class="mt-1 p-2 bg-black/5 text-on-surface-variant rounded text-[10px] overflow-x-auto max-w-full white-space-pre-wrap">${JSON.stringify(log.details, null, 2)}</pre>`;
                                        }

                                        return `
                                                <div class="p-2 border rounded ${bgClass} flex flex-col gap-1 text-left font-mono">
                                                        <div class="flex justify-between items-start">
                                                                <span class="font-bold ${colorClass}">[${log.level.toUpperCase()}]</span>
                                                                <span class="text-[10px] text-on-surface-variant">${log.timestamp}</span>
                                                        </div>
                                                        <div class="text-on-surface leading-tight font-sans text-xs">${log.message}</div>
                                                        ${detailsStr}
                                                </div>
                                        `;
                                }).reverse().join('');
                        } catch (e) {
                                container.innerHTML = `<div class="text-red-500 italic">Falha ao carregar logs: ${e.message}</div>`;
                        }
                }

                function clearDiagnosticLogs() {
                        try {
                                sessionStorage.setItem('site_logs', '[]');
                                refreshDiagnosticPanel();
                                Logger.info('Logs limpos pelo usuÃ¡rio.');
                        } catch (e) { }
                }

                function copyDiagnosticLogs() {
                        try {
                                const logs = sessionStorage.getItem('site_logs') || '[]';
                                navigator.clipboard.writeText(logs);
                                showToast("Todos os logs foram copiados para a Ã¡rea de transferÃªncia!", "check_circle");
                        } catch (e) {
                                showToast("Erro ao copiar logs.", "error");
                        }
                }

                // Attach to global window
                window.openDiagnosticPanel = openDiagnosticPanel;
                window.closeDiagnosticPanel = closeDiagnosticPanel;
                window.refreshDiagnosticPanel = refreshDiagnosticPanel;
                window.clearDiagnosticLogs = clearDiagnosticLogs;
                window.copyDiagnosticLogs = copyDiagnosticLogs;

                // Listen for Ctrl+Shift+D or Ctrl+Shift+L to open panel
                document.addEventListener('keydown', (e) => {
                        if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd' || e.key === 'L' || e.key === 'l')) {
                                e.preventDefault();
                                openDiagnosticPanel();
                        }
                });

                Logger.info('Sistema de Logs e DiagnÃ³stico ativado. Pressione Ctrl+Shift+D para abrir o Painel de DiagnÃ³stico.');

                // ==========================================
                // BACK TO TOP BUTTON
                // ==========================================
                const backToTopBtn = document.getElementById('back-to-top');
                if (backToTopBtn) {
                        window.addEventListener('scroll', () => {
                                if (window.scrollY > 400) {
                                        backToTopBtn.classList.remove('opacity-0', 'pointer-events-none');
                                        backToTopBtn.classList.add('opacity-100', 'pointer-events-auto');
                                } else {
                                        backToTopBtn.classList.add('opacity-0', 'pointer-events-none');
                                        backToTopBtn.classList.remove('opacity-100', 'pointer-events-auto');
                                }
                        });
                }

                // ==========================================
                // DARK MODE TOGGLE
                // ==========================================
                const themeToggle = document.getElementById('theme-toggle');
                const themeIcon = document.getElementById('theme-icon');
                const htmlEl = document.documentElement;

                function applyTheme(dark) {
                        if (dark) {
                                htmlEl.classList.add('dark');
                                htmlEl.classList.remove('light');
                                if (themeIcon) themeIcon.textContent = 'brightness_7';
                                localStorage.setItem('theme', 'dark');
                        } else {
                                htmlEl.classList.remove('dark');
                                htmlEl.classList.add('light');
                                if (themeIcon) themeIcon.textContent = 'brightness_5';
                                localStorage.setItem('theme', 'light');
                        }
                }

                // Load saved preference or system preference
                const savedTheme = localStorage.getItem('theme');
                if (savedTheme) {
                        applyTheme(savedTheme === 'dark');
                } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                        applyTheme(true);
                }

                if (themeToggle) {
                        themeToggle.addEventListener('click', () => {
                                const isDark = htmlEl.classList.contains('dark');
                                applyTheme(!isDark);
                        });
                }
                // System Data
                const blogArticles = {
                        "1": {
                                title: "RecomendaÃ§Ãµes de Leitura e DecoraÃ§Ã£o",
                                category: "Curadoria",
                                content: `<p class="mb-4">A curadoria de um consultÃ³rio psicolÃ³gico ou de um espaÃ§o de estudos vai muito alÃ©m da estÃ©tica: trata-se de criar um ambiente que estimule o foco e evoque a sensaÃ§Ã£o de calma. A escolha de cores neutras e terrosas, iluminaÃ§Ã£o difusa (como luminÃ¡rias de luz amarela quente) e plantas ajudam a reduzir os nÃ­veis de ansiedade e batimentos cardÃ­acos.</p>
                      <p class="mb-4">Para leituras inspiradoras, recomendamos obras que aproximam a psicologia clÃ­nica da experiÃªncia humana cotidiana:</p>
                      <ul class="list-decimal pl-6 mb-4 space-y-2">
                          <li><strong>Talvez vocÃª deva conversar com alguÃ©m</strong> (Lori Gottlieb) â€” Uma reflexÃ£o sensÃ­vel sobre o processo de terapia tanto da perspectiva do terapeuta quanto do paciente.</li>
                          <li><strong>A coragem de ser imperfeito</strong> (BrenÃ© Brown) â€” Um estudo essencial sobre vulnerabilidade, vergonha e aceitaÃ§Ã£o.</li>
                          <li><strong>O obstÃ¡culo Ã© o caminho</strong> (Ryan Holiday) â€” Filosofia estoica aplicada ao cotidiano para o desenvolvimento de resiliÃªncia.</li>
                      </ul>
                      <p>Experimente incluir pequenos elementos tÃ¡teis na sua mesa, como um bloco de notas de papel texturizado e uma caneta confortÃ¡vel, estimulando a presenÃ§a fÃ­sica no momento presente.</p>`
                        },
                        "2": {
                                title: "Lidando com a Sobrecarga",
                                category: "SaÃºde Mental",
                                content: `<p class="mb-4">No ritmo acelerado da vida moderna, a exaustÃ£o mental (ou sobrecarga cognitiva) muitas vezes se instala de maneira silenciosa. Identificar os primeiros sinais Ã© fundamental para evitar o esgotamento completo. Sintomas comuns incluem irritabilidade por motivos pequenos, dificuldade de concentraÃ§Ã£o, alteraÃ§Ãµes no sono e a sensaÃ§Ã£o constante de que "o tempo nunca Ã© suficiente".</p>
                      <p class="mb-4">EstratÃ©gias prÃ¡ticas para lidar com a sobrecarga:</p>
                      <ul class="list-disc pl-6 mb-4 space-y-2">
                          <li><strong>Pausas Ativas:</strong> Afaste-se das telas por 5 minutos a cada 1 hora de trabalho. FaÃ§a alongamentos leves ou respire profundamente olhando pela janela.</li>
                          <li><strong>DefiniÃ§Ã£o de Limites:</strong> Dizer "nÃ£o" Ã© uma habilidade de preservaÃ§Ã£o da saÃºde mental. Avalie quais compromissos sÃ£o realmente essenciais e quais podem ser delegados ou adiados.</li>
                          <li><strong>DesconexÃ£o Digital:</strong> Crie uma barreira entre o trabalho e o descanso. Desative as notificaÃ§Ãµes de aplicativos de trabalho apÃ³s o expediente.</li>
                      </ul>
                      <p>Lembre-se: descansar nÃ£o Ã© uma recompensa pela produtividade, mas uma necessidade fisiolÃ³gica e psicolÃ³gica bÃ¡sica.</p>`
                        },
                        "3": {
                                title: "O Poder da Escrita TerapÃªutica",
                                category: "ReflexÃµes",
                                content: `<p class="mb-4">A escrita terapÃªutica (ou journaling) Ã© uma ferramenta simples e cientificamente validada para a organizaÃ§Ã£o emocional. Quando colocamos em palavras o que sentimos, traduzimos sensaÃ§Ãµes difusas do cÃ©rebro em estruturas lineares e compreensÃ­veis, o que reduz a ruminaÃ§Ã£o mental.</p>
                      <p class="mb-4">Como comeÃ§ar a praticar:</p>
                      <ul class="list-disc pl-6 mb-4 space-y-2">
                          <li><strong>Sem Julgamentos:</strong> NÃ£o se preocupe com gramÃ¡tica, caligrafia ou coerÃªncia. Escreva exatamente o que vier Ã  mente.</li>
                          <li><strong>O MÃ©todo do Desabafo:</strong> Escreva por 10 minutos seguidos sobre uma situaÃ§Ã£o difÃ­cil ou um sentimento incÃ´modo. Se preferir, descarte o papel depois â€” o benefÃ­cio estÃ¡ no ato fÃ­sico de escrever.</li>
                          <li><strong>DiÃ¡rio de GratidÃ£o:</strong> Registre 3 pequenas coisas pelas quais vocÃª se sente grata no dia. Isso ajuda a reinar o cÃ©rebro para identificar aspectos positivos da rotina.</li>
                      </ul>
                      <p>Ao externalizar seus pensamentos no papel, vocÃª cria um distanciamento saudÃ¡vel de suas emoÃ§Ãµes, permitindo olhÃ¡-las com mais clareza e autocompaixÃ£o.</p>`
                        }
                };

                const legalContent = {
                        terms: {
                                title: "Termos de Uso",
                                content: `<h4 class="font-bold text-lg mb-2">1. AceitaÃ§Ã£o dos Termos</h4>
                      <p class="mb-4">Ao acessar o site de Ester Figueiredo, vocÃª concorda em cumprir estes termos de serviÃ§o e todas as leis aplicÃ¡veis.</p>
                      <h4 class="font-bold text-lg mb-2">2. Finalidade Informativa</h4>
                      <p class="mb-4">O conteÃºdo deste site (textos, artigos, curadorias) possui carÃ¡ter estritamente educativo e informativo. NÃ£o substitui consulta, diagnÃ³stico ou acompanhamento psicolÃ³gico profissional.</p>
                      <h4 class="font-bold text-lg mb-2">3. VÃ­nculo Profissional</h4>
                      <p class="mb-4">A navegaÃ§Ã£o pelo site ou envio de dados no formulÃ¡rio de lista de espera nÃ£o estabelece relaÃ§Ã£o terapÃªutica formal. O inÃ­cio do processo clÃ­nico serÃ¡ formalizado em contrato de prestaÃ§Ã£o de serviÃ§os psicolÃ³gicos.</p>
                      <h4 class="font-bold text-lg mb-2">4. Links para Terceiros</h4>
                      <p>Nosso site possui links externos (como WhatsApp e CVV). NÃ£o exercemos controle sobre o conteÃºdo ou prÃ¡ticas de sites de terceiros e nÃ£o podemos assumir responsabilidade por suas respectivas polÃ­ticas.</p>`
                        },
                        privacy: {
                                title: "PolÃ­tica de Privacidade",
                                content: `<h4 class="font-bold text-lg mb-2">1. Coleta de InformaÃ§Ãµes</h4>
                      <p class="mb-4">Coletamos apenas as informaÃ§Ãµes inseridas voluntariamente por vocÃª no formulÃ¡rio de Lista de Espera (Nome Completo, Idade, WhatsApp e Cidade/Estado).</p>
                      <h4 class="font-bold text-lg mb-2">2. Uso das InformaÃ§Ãµes</h4>
                      <p class="mb-4">Estes dados sÃ£o utilizados unicamente para entrar em contato com vocÃª sobre a disponibilidade de horÃ¡rios para atendimento clÃ­nico.</p>
                      <h4 class="font-bold text-lg mb-2">3. SeguranÃ§a dos Dados</h4>
                      <p class="mb-4">Adotamos medidas de seguranÃ§a tÃ©cnicas para proteger os seus dados contra acessos nÃ£o autorizados. Seus dados nunca serÃ£o compartilhados, vendidos ou repassados a terceiros.</p>
                      <h4 class="font-bold text-lg mb-2">4. Direitos do UsuÃ¡rio (LGPD)</h4>
                      <p class="mb-4">VocÃª possui direito de acessar, atualizar, corrigir ou solicitar a exclusÃ£o definitiva de seus dados de nossa lista de espera a qualquer momento por meio do e-mail <strong>psiesterfigueiredo@gmail.com</strong>.</p>
                      <h4 class="font-bold text-lg mb-2">5. Sigilo ClÃ­nico</h4>
                      <p>O sigilo sobre quaisquer conteÃºdos abordados nos contatos diretos e sessÃµes Ã© resguardado estritamente conforme o CÃ³digo de Ã‰tica do PsicÃ³logo estabelecido pelo Conselho Federal de Psicologia.</p>`
                        }
                };

                // DOM Elements
                const mobileMenu = document.getElementById('mobile-menu');
                const mobileMenuDrawer = document.getElementById('mobile-menu-drawer');
                const mobileMenuBtn = document.getElementById('mobile-menu-btn');
                const mobileMenuClose = document.getElementById('mobile-menu-close');

                const customModal = document.getElementById('custom-modal');
                const customModalDialog = document.getElementById('custom-modal-dialog');
                const modalCloseBtn = document.getElementById('modal-close-btn');
                const modalContentArea = document.getElementById('modal-content-area');

                const successModal = document.getElementById('success-modal');
                const successModalDialog = document.getElementById('success-modal-dialog');
                const successModalClose = document.getElementById('success-modal-close');

                const toast = document.getElementById('toast');
                const toastIcon = document.getElementById('toast-icon');
                const toastMessage = document.getElementById('toast-message');

                const waitlistSubmit = document.getElementById('waitlist-submit');

                // 1. Mobile Menu Logic
                function openMobileMenu() {
                        mobileMenu.classList.remove('pointer-events-none', 'opacity-0');
                        mobileMenu.classList.add('opacity-100');
                        mobileMenuDrawer.classList.remove('translate-x-full');
                        mobileMenuDrawer.classList.add('translate-x-0');
                        document.body.style.overflow = 'hidden';
                }

                function closeMobileMenu() {
                        mobileMenu.classList.add('pointer-events-none', 'opacity-0');
                        mobileMenu.classList.remove('opacity-100');
                        mobileMenuDrawer.classList.add('translate-x-full');
                        mobileMenuDrawer.classList.remove('translate-x-0');
                        document.body.style.overflow = '';
                }

                mobileMenuBtn.addEventListener('click', openMobileMenu);
                mobileMenuClose.addEventListener('click', closeMobileMenu);
                mobileMenu.addEventListener('click', (e) => {
                        if (e.target === mobileMenu) closeMobileMenu();
                });

                // Close mobile menu on anchor link clicks
                document.querySelectorAll('#mobile-menu-drawer a').forEach(link => {
                        link.addEventListener('click', () => {
                                closeMobileMenu();
                        });
                });

                // 2. Toast System
                let toastTimeout;
                function showToast(message, icon = 'info') {
                        clearTimeout(toastTimeout);
                        toastIcon.textContent = icon;
                        toastMessage.textContent = message;

                        toast.classList.remove('pointer-events-none', 'opacity-0', 'translate-y-12');
                        toast.classList.add('opacity-100', 'translate-y-0');

                        toastTimeout = setTimeout(() => {
                                toast.classList.add('pointer-events-none', 'opacity-0', 'translate-y-12');
                                toast.classList.remove('opacity-100', 'translate-y-0');
                        }, 3000);
                }

                // 3. General Modals Logic
                function openModal(htmlContent) {
                        modalContentArea.innerHTML = htmlContent;
                        customModal.classList.remove('pointer-events-none', 'opacity-0');
                        customModal.classList.add('opacity-100');
                        customModalDialog.classList.remove('scale-95');
                        customModalDialog.classList.add('scale-100');
                        document.body.style.overflow = 'hidden';
                }

                function closeModal() {
                        customModal.classList.add('pointer-events-none', 'opacity-0');
                        customModal.classList.remove('opacity-100');
                        customModalDialog.classList.add('scale-95');
                        customModalDialog.classList.remove('scale-100');
                        if (!successModal.classList.contains('opacity-100')) {
                                document.body.style.overflow = '';
                        }
                }

                modalCloseBtn.addEventListener('click', closeModal);
                customModal.addEventListener('click', (e) => {
                        if (e.target === customModal) closeModal();
                });

                // 4. Success Modal for Waitlist
                function openSuccessModal() {
                        successModal.classList.remove('pointer-events-none', 'opacity-0');
                        successModal.classList.add('opacity-100');
                        successModalDialog.classList.remove('scale-95');
                        successModalDialog.classList.add('scale-100');
                        document.body.style.overflow = 'hidden';
                }

                function closeSuccessModal() {
                        successModal.classList.add('pointer-events-none', 'opacity-0');
                        successModal.classList.remove('opacity-100');
                        successModalDialog.classList.add('scale-95');
                        successModalDialog.classList.remove('scale-100');
                        document.body.style.overflow = '';
                }

                successModalClose.addEventListener('click', closeSuccessModal);
                successModal.addEventListener('click', (e) => {
                        if (e.target === successModal) closeSuccessModal();
                });

                // Esc key closes all active modals/menu
                document.addEventListener('keydown', (e) => {
                        if (e.key === 'Escape') {
                                closeMobileMenu();
                                closeModal();
                                closeSuccessModal();
                        }
                });

                // 5. Connect Elements & Triggers
                // Blog article click
                document.querySelectorAll('.read-article-btn').forEach(btn => {
                        btn.addEventListener('click', () => {
                                const articleId = btn.getAttribute('data-id');
                                const article = blogArticles[articleId];
                                if (article) {
                                        const html = `
                    <span class="text-xs font-typewriter text-primary mb-2 uppercase tracking-wider block">${article.category}</span>
                    <h3 class="font-handwritten text-4xl text-on-surface mb-6 border-b border-primary/20 pb-4">${article.title}</h3>
                    <div class="font-typewriter text-on-surface-variant leading-relaxed text-base space-y-4">
                        ${article.content}
                    </div>
                `;
                                        openModal(html);
                                }
                        });
                });

                // Terms and Privacy links click
                document.getElementById('terms-link').addEventListener('click', () => {
                        const terms = legalContent.terms;
                        const html = `
            <h3 class="font-handwritten text-4xl text-on-surface mb-6 border-b border-primary/20 pb-4">${terms.title}</h3>
            <div class="font-typewriter text-on-surface-variant leading-relaxed text-sm space-y-4">
                ${terms.content}
            </div>
        `;
                        openModal(html);
                });

                document.getElementById('privacy-link').addEventListener('click', () => {
                        const privacy = legalContent.privacy;
                        const html = `
            <h3 class="font-handwritten text-4xl text-on-surface mb-6 border-b border-primary/20 pb-4">${privacy.title}</h3>
            <div class="font-typewriter text-on-surface-variant leading-relaxed text-sm space-y-4">
                ${privacy.content}
            </div>
        `;
                        openModal(html);
                });

                // Emergency button click
                document.getElementById('emergency-btn').addEventListener('click', () => {
                        const html = `
            <h3 class="font-handwritten text-4xl text-on-surface mb-6 border-b border-primary/20 pb-4">Apoio Emocional Imediato</h3>
            <div class="font-typewriter text-on-surface-variant leading-relaxed text-sm space-y-4">
                <p>Se vocÃª estÃ¡ passando por um momento difÃ­cil, saiba que nÃ£o estÃ¡ sÃ³. Existem canais de apoio gratuitos, sigilosos e disponÃ­veis para te acolher agora mesmo.</p>
                
                <div class="p-4 bg-primary-fixed text-on-primary-fixed-variant rounded-lg border border-primary/10 shadow-sm space-y-3">
                    <h4 class="font-bold text-base flex items-center gap-2">
                        <span class="material-symbols-outlined text-lg">chat</span>
                        Atendimento via Chat (CVV)
                    </h4>
                    <p>VocÃª pode conversar com um voluntÃ¡rio do CVV (Centro de ValorizaÃ§Ã£o da Vida) diretamente pelo navegador.</p>
                    <p class="text-xs"><strong>HorÃ¡rios do Chat do CVV:</strong><br>
                    â€¢ Domingo: 17h Ã s 01h<br>
                    â€¢ Segunda a Quinta: 09h Ã s 01h<br>
                    â€¢ Sexta-feira: 15h Ã s 23h<br>
                    â€¢ SÃ¡bado: 16h Ã  meia-noite</p>
                    <a href="https://cvv.org.br/chat/" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-on-secondary rounded-full text-xs font-bold hover:bg-secondary/90 transition-colors shadow-sm mt-1">
                        Acessar Chat do CVV
                        <span class="material-symbols-outlined text-xs">open_in_new</span>
                    </a>
                </div>

                <div class="p-4 bg-surface-container-highest text-on-surface-variant rounded-lg border border-outline-variant/30 space-y-3">
                    <h4 class="font-bold text-base flex items-center gap-2">
                        <span class="material-symbols-outlined text-lg">call</span>
                        LigaÃ§Ã£o para o CVV - 188
                    </h4>
                    <p>O atendimento telefÃ´nico pelo <strong>188</strong> Ã© gratuito, confidencial e funciona <strong>24 horas por dia, todos os dias do ano</strong>.</p>
                    
                    <div id="mobile-call-container">
                        <a href="tel:188" id="call-188-btn" class="inline-flex md:hidden items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-full text-xs font-bold hover:bg-primary/95 transition-colors shadow-sm">
                            <span class="material-symbols-outlined text-xs">call</span>
                            Ligar 188 (Celular)
                        </a>
                        <div class="hidden md:block text-xs text-on-surface-variant/80 italic flex items-center gap-1.5 mt-2">
                            <span class="material-symbols-outlined text-sm text-amber-600">info</span>
                            Dica: Se estiver acessando de um celular, vocÃª pode tocar para ligar diretamente. No computador, disque 188 do seu telefone fixo ou mÃ³vel.
                        </div>
                    </div>
                </div>
            </div>
        `;
                        openModal(html);
                });

                // Phone input mask (WhatsApp)
                const phoneInputEl = document.getElementById('whatsapp');
                phoneInputEl.addEventListener('input', (e) => {
                        let value = e.target.value.replace(/\D/g, '');
                        if (value.length > 11) value = value.slice(0, 11);

                        if (value.length > 10) {
                                e.target.value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
                        } else if (value.length > 6) {
                                e.target.value = `(${value.slice(0, 2)}) ${value.slice(2, 6)}-${value.slice(6)}`;
                        } else if (value.length > 2) {
                                e.target.value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
                        } else if (value.length > 0) {
                                e.target.value = `(${value}`;
                        } else {
                                e.target.value = '';
                        }
                });

                // 6. Waitlist Form Validation and Submission
                waitlistSubmit.addEventListener('click', () => {
                        // ENDPOINT DE ENVIO - FormSubmit.co direciona para o e-mail da psicÃ³loga de forma gratuita e imediata
                        const FORM_ENDPOINT = 'https://formsubmit.co/ajax/psiesterfigueiredo@gmail.com';

                        const nameInput = document.getElementById('name');
                        const emailInput = document.getElementById('email');
                        const ageInput = document.getElementById('age');
                        const whatsappInput = document.getElementById('whatsapp');
                        const locationInput = document.getElementById('location');
                        const messageInput = document.getElementById('user-message');

                        // Reset error styling
                        const inputs = [nameInput, emailInput, ageInput, whatsappInput, locationInput, messageInput];
                        inputs.forEach(input => {
                                if (input) {
                                        input.classList.remove('border-red-500');
                                        input.classList.add('border-outline-variant');
                                }
                        });

                        // Validation checks
                        let hasError = false;
                        if (!nameInput.value.trim()) {
                                nameInput.classList.remove('border-outline-variant');
                                nameInput.classList.add('border-red-500');
                                hasError = true;
                        }
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!emailInput.value.trim() || !emailRegex.test(emailInput.value.trim())) {
                                emailInput.classList.remove('border-outline-variant');
                                emailInput.classList.add('border-red-500');
                                hasError = true;
                        }
                        if (!ageInput.value || parseInt(ageInput.value) <= 0) {
                                ageInput.classList.remove('border-outline-variant');
                                ageInput.classList.add('border-red-500');
                                hasError = true;
                        }
                        const phoneDigits = whatsappInput.value.replace(/\D/g, '');
                        if (phoneDigits.length < 10 || phoneDigits.length > 11) {
                                whatsappInput.classList.remove('border-outline-variant');
                                whatsappInput.classList.add('border-red-500');
                                hasError = true;
                        }
                        if (!locationInput.value.trim()) {
                                locationInput.classList.remove('border-outline-variant');
                                locationInput.classList.add('border-red-500');
                                hasError = true;
                        }

                        if (hasError) {
                                showToast("Por favor, preencha todos os campos obrigatÃ³rios corretamente.", "warning");
                                return;
                        }

                        // Prepare payload
                        const payload = {
                                Nome: nameInput.value.trim(),
                                Email: emailInput.value.trim(),
                                Idade: parseInt(ageInput.value),
                                WhatsApp: whatsappInput.value.trim(),
                                Localizacao: locationInput.value.trim(),
                                Mensagem: messageInput ? messageInput.value.trim() : "",
                                timestamp: new Date().toISOString()
                        };

                        // Save data to localStorage (local backup)
                        let currentSubmissions = [];
                        try {
                                const saved = localStorage.getItem('waitlist_submissions');
                                if (saved) {
                                        currentSubmissions = JSON.parse(saved);
                                }
                        } catch (e) {
                                Logger.error("Erro ao ler lista de espera local", e);
                        }
                        currentSubmissions.push(payload);
                        localStorage.setItem('waitlist_submissions', JSON.stringify(currentSubmissions));

                        // Visual feedback: disable button and show loading text
                        const originalBtnText = waitlistSubmit.textContent;
                        waitlistSubmit.disabled = true;
                        waitlistSubmit.textContent = 'Enviando...';

                        // Send request
                        fetch(FORM_ENDPOINT, {
                                method: 'POST',
                                headers: {
                                        'Content-Type': 'application/json',
                                        'Accept': 'application/json'
                                },
                                body: JSON.stringify(payload)
                        })
                                .then(response => {
                                        if (response.ok) {
                                                // Reset inputs and show success modal
                                                inputs.forEach(input => input.value = '');
                                                openSuccessModal();
                                                // A primeira submissÃ£o exige uma ativaÃ§Ã£o no e-mail
                                                showToast("Dados enviados! Verifique se hÃ¡ um e-mail de ativaÃ§Ã£o do FormSubmit na sua caixa de entrada.", "info");
                                                Logger.success("FormulÃ¡rio da lista de espera enviado com sucesso.", { status: response.status, payload });
                                                if (typeof gtag === 'function') {
                                                        gtag('event', 'waitlist_submit', { event_category: 'engagement', event_label: 'Lista de Espera' });
                                                }
                                        } else {
                                                showToast("Houve um problema ao enviar. Seus dados foram salvos localmente.", "warning");
                                                openSuccessModal(); // fallback visual
                                                Logger.error("FormSubmit retornou resposta de erro no envio do formulÃ¡rio.", { status: response.status, statusText: response.statusText });
                                        }
                                })
                                .catch(error => {
                                        Logger.error("Erro de rede durante o envio do formulÃ¡rio.", { erro: error.message, stack: error.stack });
                                        showToast("Sem conexÃ£o. Seus dados foram salvos no dispositivo.", "wifi_off");
                                        openSuccessModal(); // fallback visual
                                })
                                .finally(() => {
                                        waitlistSubmit.disabled = false;
                                        waitlistSubmit.textContent = originalBtnText;
                                });
                });

                // ==========================================
                // BOOKING DATA SYSTEM (Used by LINA Chat)
                // ==========================================
                const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                        ? `http://${window.location.hostname}:8000/api`
                        : `${window.location.protocol}//${window.location.hostname}/api`;
                let allBookings = [];

                // Load my booking IDs from localStorage (private client state)
                function getMyBookingIds() {
                        try {
                                return JSON.parse(localStorage.getItem('my_booking_ids') || '[]');
                        } catch (e) {
                                return [];
                        }
                }

                function addMyBookingId(id) {
                        try {
                                const ids = getMyBookingIds();
                                if (!ids.includes(id)) {
                                        ids.push(id);
                                        localStorage.setItem('my_booking_ids', JSON.stringify(ids));
                                }
                        } catch (e) {
                                Logger.error("Erro ao salvar ID de agendamento local", e);
                        }
                }

                function removeMyBookingId(id) {
                        try {
                                let ids = getMyBookingIds();
                                ids = ids.filter(i => i !== id);
                                localStorage.setItem('my_booking_ids', JSON.stringify(ids));
                        } catch (e) {
                                Logger.error("Erro ao remover ID de agendamento local", e);
                        }
                }

                // Return all bookings for checking occupied slots
                function getBookings() {
                        return allBookings;
                }

                // Fetch all bookings from backend
                async function fetchBookingsFromSupabase() {
                        try {
                                const response = await fetch(`${API_BASE_URL}/appointments`, {
                                        method: 'GET',
                                        headers: {
                                                'Content-Type': 'application/json'
                                        }
                                });
                                if (response.ok) {
                                        allBookings = await response.json();
                                } else {
                                        Logger.error("Failed to fetch bookings from backend", response.statusText);
                                }
                        } catch (e) {
                                Logger.error("Error fetching bookings from backend", e);
                        }
                }

                // Save bookings (used as a fallback or directly by IA/legacy calls)
                async function saveBookings(bookings) {
                        try {
                                localStorage.setItem('user_appointments', JSON.stringify(bookings));
                                
                                // Find any booking in bookings that is not in allBookings
                                const newBookings = bookings.filter(b => !allBookings.some(ab => ab.id === b.id));
                                for (const nb of newBookings) {
                                        const response = await fetch(`${API_BASE_URL}/appointments`, {
                                                method: 'POST',
                                                headers: {
                                                        'Content-Type': 'application/json'
                                                },
                                                body: JSON.stringify({
                                                        name: nb.name,
                                                        email: nb.email,
                                                        whatsapp: nb.whatsapp || '(Agendado via IA)',
                                                        date: nb.date,
                                                        time: nb.time
                                                })
                                        });
                                        if (response.ok) {
                                                const savedBooking = await response.json();
                                                addMyBookingId(savedBooking.id);
                                        }
                                }
                                await fetchBookingsFromSupabase();
                        } catch (e) {
                                Logger.error("Erro ao salvar agendamentos", e);
                        }
                }

                // Initial load of bookings from Supabase
                fetchBookingsFromSupabase();

                // ==========================================
                // AI CHATBOT SYSTEM
                // ==========================================
                const chatToggle = document.getElementById('chat-toggle');
                const chatWindow = document.getElementById('chat-window');
                const chatClose = document.getElementById('chat-close');
                const chatInput = document.getElementById('chat-input');
                const chatSend = document.getElementById('chat-send');
                const chatMessages = document.getElementById('chat-messages');

                let isChatOpen = false;

                // HistÃ³rico da conversa inicializado com a mensagem de saudaÃ§Ã£o
                let chatHistory = [
                        {
                                role: 'assistant',
                                content: 'OlÃ¡! Sou a Lina, assistente virtual da Dra. Ester. Como posso te ajudar a entender sobre o processo terapÃªutico, ansiedade, depressÃ£o, localizaÃ§Ã£o ou valores hoje?'
                        }
                ];

                function toggleChat() {
                        isChatOpen = !isChatOpen;
                        if (isChatOpen) {
                                chatWindow.classList.remove('opacity-0', 'translate-y-10', 'pointer-events-none');
                                chatWindow.classList.add('opacity-100', 'translate-y-0', 'pointer-events-auto');
                                chatInput.focus();
                                chatToggle.classList.add('rotate-90');
                                Logger.info("Widget de chat aberto pelo usuÃ¡rio.");
                        } else {
                                chatWindow.classList.remove('opacity-100', 'translate-y-0', 'pointer-events-auto');
                                chatWindow.classList.add('opacity-0', 'translate-y-10', 'pointer-events-none');
                                chatToggle.classList.remove('rotate-90');
                                Logger.info("Widget de chat fechado pelo usuÃ¡rio.");
                        }
                }

                chatToggle.addEventListener('click', toggleChat);
                chatClose.addEventListener('click', toggleChat);

                async function sendChatMessage() {
                        const text = chatInput.value.trim();
                        if (!text) return;

                        appendChatMessage(text, 'user');
                        chatInput.value = '';

                        // Adiciona a mensagem do usuÃ¡rio ao histÃ³rico local
                        chatHistory.push({ role: 'user', content: text });

                        const loadingBubble = appendChatMessage('Escrevendo...', 'bot', true);
                        Logger.info("Enviando pergunta ao assistente virtual...", { text });

                        try {
                                let userIdentifier = localStorage.getItem('chat_user_identifier');
                                if (!userIdentifier) {
                                        userIdentifier = 'user_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
                                        localStorage.setItem('chat_user_identifier', userIdentifier);
                                }

                                const response = await fetch(`${API_BASE_URL}/chat`, {
                                        method: 'POST',
                                        headers: {
                                                'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify({ 
                                                user_identifier: userIdentifier,
                                                message: text
                                        })
                                });

                                if (!response.ok) {
                                        throw new Error(`HTTP error! status: ${response.status}`);
                                }

                                const data = await response.json();
                                loadingBubble.remove();

                                const botResponse = data.response || "Desculpe, tive um problema ao processar a resposta.";
                                
                                // Salva a resposta original no histÃ³rico para manter o contexto da IA
                                chatHistory.push({ role: 'assistant', content: botResponse });

                                // Processa comandos especiais como o [SCHEDULE: Nome | Email | YYYY-MM-DD | HH:MM]
                                const scheduleRegex = /\[SCHEDULE:\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^\]]+?)\s*\]/i;
                                const match = botResponse.match(scheduleRegex);
                                let cleanedResponse = botResponse;

                                if (match) {
                                        cleanedResponse = botResponse.replace(scheduleRegex, '').trim();
                                        const name = match[1].trim();
                                        const email = match[2].trim();
                                        const date = match[3].trim();
                                        const time = match[4].trim();

                                        try {
                                                const currentBookings = getBookings();
                                                const isOcupado = currentBookings.some(b => b.date === date && b.time === time);

                                                if (isOcupado) {
                                                        Logger.warn("IA tentou agendar horÃ¡rio ocupado:", { date, time });
                                                        appendChatMessage("Nota: O horÃ¡rio " + time + " no dia " + date + " jÃ¡ estÃ¡ ocupado. Por favor, tente escolher outro horÃ¡rio.", "bot");
                                                } else {
                                                        const newBooking = {
                                                                id: 'booking-' + Date.now(),
                                                                name,
                                                                email,
                                                                whatsapp: '(Agendado via IA)',
                                                                date,
                                                                time,
                                                                timestamp: new Date().toISOString()
                                                        };
                                                        currentBookings.push(newBooking);
                                                        saveBookings(currentBookings);

                                                        showToast("SessÃ£o agendada com sucesso via Assistente Virtual!", "check_circle");
                                                        Logger.success("Novo agendamento realizado via Assistente IA.", newBooking);
                                                        if (typeof gtag === 'function') {
                                                                gtag('event', 'booking_chat', { event_category: 'conversion', event_label: 'Agendamento via Chat' });
                                                        }
                                                }
                                        } catch (e) {
                                                Logger.error("Erro ao persistir agendamento do chat", e);
                                        }
                                }

                                appendChatMessage(cleanedResponse, 'bot');
                                Logger.success("Resposta recebida com sucesso do assistente virtual.");
                        } catch (error) {
                                Logger.error("Erro ao chamar o proxy da Cloudflare no chat.", { erro: error.message });
                                loadingBubble.remove();
                                appendChatMessage("Desculpe, estou com instabilidade de conexÃ£o agora. Por favor, tente novamente mais tarde ou fale diretamente comigo pelo WhatsApp!", 'error');
                        }
                }

                function appendChatMessage(text, sender, isLoading = false) {
                        const bubbleWrapper = document.createElement('div');
                        bubbleWrapper.className = `flex w-full gap-2 items-end ${sender === 'user' ? 'justify-end' : 'justify-start'}`;

                        if (sender === 'bot') {
                                const avatar = document.createElement('img');
                                avatar.src = "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=100&h=100";
                                avatar.alt = "Lina";
                                avatar.className = "w-7 h-7 rounded-full object-cover border border-primary/10 flex-shrink-0 mb-1";
                                bubbleWrapper.appendChild(avatar);
                        }

                        const bubble = document.createElement('div');
                        if (sender === 'user') {
                                bubble.className = "bg-secondary text-on-secondary p-3 rounded-lg max-w-[80%] border border-secondary/10 shadow-sm leading-relaxed text-left font-caption";
                        } else if (sender === 'bot') {
                                bubble.className = "bg-primary-fixed text-on-primary-fixed-variant p-3 rounded-lg max-w-[80%] border border-primary/10 shadow-sm leading-relaxed font-caption";
                                if (isLoading) {
                                        bubble.classList.add('animate-pulse', 'italic', 'opacity-70');
                                }
                        } else {
                                bubble.className = "bg-red-100 text-red-800 p-2.5 rounded text-xs text-center border border-red-200/40 w-full";
                        }

                        if (sender !== 'error') {
                                bubble.innerHTML = text.replace(/\n/g, '<br>');
                        } else {
                                bubble.innerText = text;
                        }

                        bubbleWrapper.appendChild(bubble);
                        chatMessages.appendChild(bubbleWrapper);
                        chatMessages.scrollTop = chatMessages.scrollHeight;

                        return bubbleWrapper;
                }

                chatSend.addEventListener('click', sendChatMessage);
                chatInput.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                                sendChatMessage();
                        }
                });

                function openChatWithBooking() {
                        if (typeof closeMobileMenu === 'function') {
                                closeMobileMenu();
                        }
                        if (!isChatOpen) {
                                toggleChat();
                        }
                        chatInput.value = "OlÃ¡! Gostaria de agendar uma consulta. Qual Ã© o primeiro dia e horÃ¡rio disponÃ­vel na agenda?";
                        sendChatMessage();
                }

                // Intercept clicks on scheduling buttons
                document.querySelectorAll('a[href="#agendar-consulta"]').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                                e.preventDefault();
                                openChatWithBooking();
                        });
                });

                // ==========================================
                // ADMIN & PDF SALES SYSTEM SCRIPT
                // ==========================================
                const adminModal = document.getElementById('admin-modal');
                const adminModalDialog = document.getElementById('admin-modal-dialog');
                const adminModalClose = document.getElementById('admin-modal-close');
                const adminLoginPanel = document.getElementById('admin-login-panel');
                const adminDashboardPanel = document.getElementById('admin-dashboard-panel');
                const adminPasswordInput = document.getElementById('admin-password-input');
                const adminLoginBtn = document.getElementById('admin-login-btn');
                const adminTabBtns = document.querySelectorAll('.admin-tab-btn');
                const adminTabContents = document.querySelectorAll('.admin-tab-content');

                // Site Content inputs
                const adminContentHeroTitle = document.getElementById('admin-content-hero-title');
                const adminContentHeroDesc = document.getElementById('admin-content-hero-desc');
                const adminContentHeroImg = document.getElementById('admin-content-hero-img');
                const adminContentAboutTitle = document.getElementById('admin-content-about-title');
                const adminContentAboutImg = document.getElementById('admin-content-about-img');
                const adminContentAboutContent = document.getElementById('admin-content-about-content');
                const adminContentAboutFooter = document.getElementById('admin-content-about-footer');
                const adminContentComoImg = document.getElementById('admin-content-como-img');
                const adminContentDifImg = document.getElementById('admin-content-dif-img');
                const adminContentValorSessao = document.getElementById('admin-content-valor-sessao');
                const adminContentValorMensal = document.getElementById('admin-content-valor-mensal');
                const adminContentValoresImg = document.getElementById('admin-content-valores-img');
                const adminSaveContentBtn = document.getElementById('admin-save-content-btn');

                // PDF/Ebooks admin inputs & list
                const adminAddPdfBtn = document.getElementById('admin-add-pdf-btn');
                const adminPdfFormContainer = document.getElementById('admin-pdf-form-container');
                const adminPdfFormTitle = document.getElementById('admin-pdf-form-title');
                const adminPdfIdInput = document.getElementById('admin-pdf-id');
                const adminPdfTitleInput = document.getElementById('admin-pdf-title');
                const adminPdfPriceInput = document.getElementById('admin-pdf-price');
                const adminPdfDescInput = document.getElementById('admin-pdf-desc');
                const adminPdfIconInput = document.getElementById('admin-pdf-icon');
                const adminPdfPaymentLinkInput = document.getElementById('admin-pdf-payment-link');
                const adminPdfCancelBtn = document.getElementById('admin-pdf-cancel-btn');
                const adminPdfSaveBtn = document.getElementById('admin-pdf-save-btn');
                const adminPdfListContainer = document.getElementById('admin-pdf-list');

                // Blog admin
                const adminAddBlogBtn = document.getElementById('admin-add-blog-btn');
                const adminBlogFormContainer = document.getElementById('admin-blog-form-container');
                const adminBlogFormTitle = document.getElementById('admin-blog-form-title');
                const adminBlogIdInput = document.getElementById('admin-blog-id');
                const adminBlogTitleInput = document.getElementById('admin-blog-title');
                const adminBlogCategoryInput = document.getElementById('admin-blog-category');
                const adminBlogDateInput = document.getElementById('admin-blog-date');
                const adminBlogExcerptInput = document.getElementById('admin-blog-excerpt');
                const adminBlogContentInput = document.getElementById('admin-blog-content');
                const adminBlogImageInput = document.getElementById('admin-blog-image');
                const adminBlogCancelBtn = document.getElementById('admin-blog-cancel-btn');
                const adminBlogSaveBtn = document.getElementById('admin-blog-save-btn');
                const adminBlogListContainer = document.getElementById('admin-blog-list');

                // Pages admin
                const adminTestimonialsList = document.getElementById('admin-testimonials-list');
                const adminAddTestimonialBtn = document.getElementById('admin-add-testimonial-btn');
                const adminFaqList = document.getElementById('admin-faq-list');
                const adminAddFaqBtn = document.getElementById('admin-add-faq-btn');
                const adminSavePagesBtn = document.getElementById('admin-save-pages-btn');

                // Globals admin
                const adminGlobalWhatsapp = document.getElementById('admin-global-whatsapp');
                const adminGlobalEmail = document.getElementById('admin-global-email');
                const adminGlobalPhone = document.getElementById('admin-global-phone');
                const adminGlobalAddress = document.getElementById('admin-global-address');
                const adminGlobalInstagram = document.getElementById('admin-global-instagram');
                const adminGlobalOtherSocial = document.getElementById('admin-global-other-social');
                const adminGlobalLogo = document.getElementById('admin-global-logo');
                const adminGlobalEbooksCtaText = document.getElementById('admin-global-ebooks-cta-text');
                const adminSaveGlobalsBtn = document.getElementById('admin-save-globals-btn');

                let adminToken = null;

                // Image upload preview helper
                function adminPreviewImage(input, previewId) {
                        if (input.files && input.files[0]) {
                                const reader = new FileReader();
                                reader.onload = function(e) {
                                        const img = document.getElementById(previewId);
                                        if (img) img.src = e.target.result;
                                };
                                reader.readAsDataURL(input.files[0]);
                        }
                }

                function setPreview(previewId, src) {
                        const img = document.getElementById(previewId);
                        if (img && src) img.src = src;
                }

                function getFileFromInput(inputId) {
                        return new Promise((resolve) => {
                                const input = document.getElementById(inputId);
                                if (input && input.files && input.files[0]) {
                                        const reader = new FileReader();
                                        reader.onload = (e) => resolve(e.target.result);
                                        reader.readAsDataURL(input.files[0]);
                                } else {
                                        resolve(null);
                                }
                        });
                }

                // 1. Load Dynamic Site Content
                async function loadSiteData() {
                        const d = {
                                hero_title: "Criando caminhos de leveza e propósito.",
                                hero_desc: "Um espaço seguro e acolhedor para o seu processo terapêutico. Atendimento online para todo o Brasil e brasileiros no exterior.",
                                hero_img: "assets/ester-hero.jpg",
                                about_title: "Muito prazer!",
                                about_img: "https://lh3.googleusercontent.com/aida-public/AB6AXuA0Cy4cegf_snE5C1lWCj6vZyxTWNruYAHk1UnxpSUYuTd0l9nVbA4BCI-a9DppeiXPivkhUuaA3ed1CGoTad1anEbbQ1TOiYfI7Ak2SQ6TQP5Kz22exuTCIn2FI85DzQC5A4z54pAcLDneiPXUBM9C9pw_AdaLdVfGpHbgQYEp60Bj8QWOEQ4HgvDXUy9woCAV6nP-8GEmE3lP8g5ZcynTdtK4XlFCSKFcnwVkkvmuEyY8emuRVEnroSI1X33fdPPbOfxMjTnkHe8",
                                about_content: "<p class=\"\">Sou psicóloga, mas não só isso. Minha bagagem também passa pela comunicação, mídias sociais e pela paixão por processos criativos.</p><p class=\"\">Tenho prática clínica e na saúde, com mulheres e público 60+.</p><p class=\"\">Acredito que viver é um percurso em construção. Que nenhuma história é reta, nenhuma dor é definitiva e nenhum caminho é percorrido sozinho. Que transformar não é apagar marcas, mas ressignificá-las.</p><p class=\"\">Escolho uma psicologia que não encaixa pessoas em moldes, mas as convida a florescer no próprio ritmo. Meu propósito é criar caminhos de leveza, onde cada passo, mesmo difícil, possa carregar sentido, presença e esperança.</p>",
                                about_footer: "Formada pela Faculdade Estácio de Sá • Pós-graduanda"
                        };
                        let c = { ...d };
                        try {
                                const contentRes = await fetch(`${API_BASE_URL}/admin/site-content`);
                                if (contentRes.ok) Object.assign(c, await contentRes.json());
                        } catch (e) {}
                        Object.keys(d).forEach(key => {
                                if (!c[key] || c[key] === '') {
                                        const v = localStorage.getItem(`site_content_${key}`);
                                        if (v) c[key] = v;
                                }
                        });

                        const el = (id) => document.getElementById(id);
                        if (c.hero_title && el('hero-title')) el('hero-title').innerText = c.hero_title;
                        if (c.hero_desc && el('hero-desc')) el('hero-desc').innerText = c.hero_desc;
                        if (c.hero_img) { const img = document.querySelector('img[alt="Background banner"]'); if(img) img.src = c.hero_img; }
                        if (c.about_title && el('about-title')) el('about-title').innerText = c.about_title;
                        if (c.about_img && el('about-img')) el('about-img').src = c.about_img;
                        if (c.about_content && el('about-content')) el('about-content').innerHTML = c.about_content;
                        if (c.about_footer && el('about-footer')) el('about-footer').innerText = c.about_footer;
                }

                // Load globals
                function loadGlobals() {
                        const g = JSON.parse(localStorage.getItem('site_globals') || '{}');
                        if (adminGlobalWhatsapp) adminGlobalWhatsapp.value = g.whatsapp || '5521988489341';
                        if (adminGlobalEmail) adminGlobalEmail.value = g.email || 'psiesterfigueiredo@gmail.com';
                        if (adminGlobalPhone) adminGlobalPhone.value = g.phone || '+55 21 98848-9341';
                        if (adminGlobalAddress) adminGlobalAddress.value = g.address || 'Nova Iguaçu, RJ';
                        if (adminGlobalInstagram) adminGlobalInstagram.value = g.instagram || 'https://instagram.com/psiesterfigueiredo';
                        if (adminGlobalOtherSocial) adminGlobalOtherSocial.value = g.other_social || '';
                        if (adminGlobalLogo) adminGlobalLogo.value = g.logo || '';
                        if (adminGlobalEbooksCtaText) adminGlobalEbooksCtaText.value = g.ebooks_cta_text || 'Conteúdos exclusivos criados pela Dra. Ester Figueiredo para apoiar seu journey de autoconhecimento e saúde mental.';
                }

                // Load Blog Posts from localStorage
                function loadBlogPosts() {
                        return JSON.parse(localStorage.getItem('site_blog_posts') || '[]');
                }

                function saveBlogPosts(posts) {
                        localStorage.setItem('site_blog_posts', JSON.stringify(posts));
                }

                function renderBlogList() {
                        const posts = loadBlogPosts();
                        if (!adminBlogListContainer) return;
                        if (posts.length === 0) {
                                adminBlogListContainer.innerHTML = '<p class="italic text-on-surface-variant text-sm py-4">Nenhum artigo publicado ainda.</p>';
                                return;
                        }
                        adminBlogListContainer.innerHTML = posts.map((p, i) => `
                                <div class="p-4 bg-surface-container rounded-lg border border-outline-variant/30 flex justify-between items-center">
                                        <div>
                                                <h5 class="font-bold text-sm text-on-surface">${p.title}</h5>
                                                <p class="text-xs text-on-surface-variant">${p.category} • ${p.date}</p>
                                        </div>
                                        <div class="flex gap-2">
                                                <button class="px-3 py-1 bg-primary text-on-primary rounded text-xs edit-blog-btn" data-idx="${i}">Editar</button>
                                                <button class="px-3 py-1 bg-red-600 text-white rounded text-xs delete-blog-btn" data-idx="${i}">Excluir</button>
                                        </div>
                                </div>
                        `).join('');

                        document.querySelectorAll('.edit-blog-btn').forEach(btn => {
                                btn.addEventListener('click', () => {
                                        const idx = parseInt(btn.getAttribute('data-idx'));
                                        const p = posts[idx];
                                        adminBlogFormContainer.classList.remove('hidden');
                                        adminBlogFormTitle.innerText = 'Editar Artigo';
                                        adminBlogIdInput.value = idx;
                                        adminBlogTitleInput.value = p.title;
                                        adminBlogCategoryInput.value = p.category_key || 'curadoria';
                                        adminBlogDateInput.value = p.date || '';
                                        adminBlogExcerptInput.value = p.excerpt || '';
                                        adminBlogContentInput.value = p.content || '';
                                        setPreview('preview-blog-image', p.image || 'assets/ester-blog.jpg');
                                });
                        });

                        document.querySelectorAll('.delete-blog-btn').forEach(btn => {
                                btn.addEventListener('click', () => {
                                        const idx = parseInt(btn.getAttribute('data-idx'));
                                        if (confirm('Excluir este artigo?')) {
                                                posts.splice(idx, 1);
                                                saveBlogPosts(posts);
                                                renderBlogList();
                                                showToast('Artigo excluído!', 'check_circle');
                                        }
                                });
                        });
                }

                // Load Testimonials from localStorage
                function loadTestimonials() {
                        return JSON.parse(localStorage.getItem('site_testimonials') || '[]');
                }

                function saveTestimonials(items) {
                        localStorage.setItem('site_testimonials', JSON.stringify(items));
                }

                function renderTestimonialsList() {
                        const items = loadTestimonials();
                        if (!adminTestimonialsList) return;
                        if (items.length === 0) {
                                adminTestimonialsList.innerHTML = '<p class="italic text-on-surface-variant text-sm py-4">Nenhum depoimento cadastrado.</p>';
                                return;
                        }
                        adminTestimonialsList.innerHTML = items.map((t, i) => `
                                <div class="p-3 bg-white rounded border border-outline-variant/30 flex justify-between items-center text-sm">
                                        <div><strong>${t.name}</strong> — <span class="text-on-surface-variant">${t.text.substring(0, 60)}...</span></div>
                                        <button class="px-2 py-1 bg-red-600 text-white rounded text-xs delete-testimonial-btn" data-idx="${i}">X</button>
                                </div>
                        `).join('');
                        document.querySelectorAll('.delete-testimonial-btn').forEach(btn => {
                                btn.addEventListener('click', () => {
                                        const idx = parseInt(btn.getAttribute('data-idx'));
                                        items.splice(idx, 1);
                                        saveTestimonials(items);
                                        renderTestimonialsList();
                                });
                        });
                }

                // Load FAQ from localStorage
                function loadFaq() {
                        return JSON.parse(localStorage.getItem('site_faq') || '[]');
                }

                function saveFaq(items) {
                        localStorage.setItem('site_faq', JSON.stringify(items));
                }

                function renderFaqList() {
                        const items = loadFaq();
                        if (!adminFaqList) return;
                        if (items.length === 0) {
                                adminFaqList.innerHTML = '<p class="italic text-on-surface-variant text-sm py-4">Nenhuma pergunta cadastrada.</p>';
                                return;
                        }
                        adminFaqList.innerHTML = items.map((f, i) => `
                                <div class="p-3 bg-white rounded border border-outline-variant/30 flex justify-between items-center text-sm">
                                        <div><strong>${f.question}</strong></div>
                                        <button class="px-2 py-1 bg-red-600 text-white rounded text-xs delete-faq-btn" data-idx="${i}">X</button>
                                </div>
                        `).join('');
                        document.querySelectorAll('.delete-faq-btn').forEach(btn => {
                                btn.addEventListener('click', () => {
                                        const idx = parseInt(btn.getAttribute('data-idx'));
                                        items.splice(idx, 1);
                                        saveFaq(items);
                                        renderFaqList();
                                });
                        });
                }

                // 1b. Load Public Products for showcase
                async function loadProducts() {
                        const grid = document.getElementById('products-grid');
                        const loading = document.getElementById('products-loading');
                        const empty = document.getElementById('products-empty');
                        if (!grid) return;
                        try {
                                const res = await fetch(`${API_BASE_URL}/products`);
                                if (!res.ok) throw new Error('Failed to fetch products');
                                const products = await res.json();
                                if (loading) loading.remove();
                                if (!products || products.length === 0) {
                                        if (empty) empty.classList.remove('hidden');
                                        return;
                                }
                                if (empty) empty.classList.add('hidden');
                                grid.innerHTML = products.map(p => `
                                        <div class="notebook-paper relative group">
                                                <div class="absolute top-2 right-2 z-20">
                                                        <span class="material-symbols-outlined text-primary text-lg">auto_stories</span>
                                                </div>
                                                <div class="p-5 flex flex-col h-full">
                                                        <div class="flex items-center gap-2 mb-3">
                                                                <span class="material-symbols-outlined text-secondary text-xl">picture_as_pdf</span>
                                                                <span class="font-label-sm text-primary uppercase tracking-wide">PDF</span>
                                                        </div>
                                                        <h4 class="font-handwritten text-xl text-on-surface mb-2 leading-snug">${p.title}</h4>
                                                        <p class="font-typewriter text-sm text-on-surface-variant mb-4 flex-1 leading-relaxed">${p.description || ''}</p>
                                                        <div class="flex items-center justify-between mt-auto pt-3 border-t border-outline-variant/30">
                                                                <span class="font-label-lg text-secondary font-bold">R$ ${p.price.toFixed(2).replace('.', ',')}</span>
                                                                <a href="${p.payment_link}" target="_blank" rel="noopener noreferrer"
                                                                        class="inline-flex items-center gap-1.5 px-4 py-2 bg-secondary text-on-secondary text-sm font-medium rounded-full hover:opacity-90 transition-all hover:translate-y-[-1px] shadow-sm cursor-pointer">
                                                                        <span class="material-symbols-outlined text-base">shopping_cart</span>
                                                                        Adquirir
                                                                </a>
                                                        </div>
                                                </div>
                                        </div>
                                `).join('');
                        } catch (e) {
                                Logger.error("Erro ao carregar produtos", e);
                                if (loading) loading.innerHTML = '<p class="font-typewriter text-on-surface-variant text-sm">Não foi possível carregar os materiais no momento.</p>';
                        }
                }

                // 2. Hotkey to open Admin Login (`Ctrl + Alt + Shift + A`)
                document.addEventListener('keydown', (e) => {
                        if (e.ctrlKey && e.altKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
                                e.preventDefault();
                                openAdminModal();
                        }
                });

                function openAdminModal() {
                        adminModal.classList.remove('pointer-events-none', 'opacity-0');
                        adminModal.classList.add('opacity-100');
                        adminModalDialog.classList.remove('scale-95');
                        adminModalDialog.classList.add('scale-100');
                        document.body.style.overflow = 'hidden';
                        adminPasswordInput.focus();
                }

                function closeAdminModal() {
                        adminModal.classList.add('pointer-events-none', 'opacity-0');
                        adminModal.classList.remove('opacity-100');
                        adminModalDialog.classList.add('scale-95');
                        adminModalDialog.classList.remove('scale-100');
                        document.body.style.overflow = '';
                        adminPasswordInput.value = '';
                }

                adminModalClose.addEventListener('click', closeAdminModal);

                // 3. Admin Authentication
                adminLoginBtn.addEventListener('click', handleAdminLogin);
                adminPasswordInput.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') handleAdminLogin();
                });

                async function handleAdminLogin() {
                        const password = adminPasswordInput.value;
                        if (!password) return;

                        try {
                                const response = await fetch(`${API_BASE_URL}/admin/login`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ password })
                                });

                                if (response.ok) {
                                        const data = await response.json();
                                        adminToken = password; // we send the password in the Authorization header
                                        adminLoginPanel.classList.add('hidden');
                                        adminDashboardPanel.classList.remove('hidden');
                                        showToast("Login administrativo realizado com sucesso!", "check_circle");
                                        loadAdminDashboardData();
                                } else {
                                        showToast("Senha incorreta. Tente novamente.", "error");
                                }
                        } catch (e) {
                                Logger.error("Erro ao autenticar administrador", e);
                                showToast("Erro de conexÃ£o com o servidor.", "wifi_off");
                        }
                }

                // 4. Admin Dashboard Tabs
                adminTabBtns.forEach(btn => {
                        btn.addEventListener('click', () => {
                                const targetTab = btn.getAttribute('data-tab');
                                
                                // Reset active tab styling
                                adminTabBtns.forEach(b => {
                                        b.classList.remove('active', 'text-primary', 'border-primary');
                                        b.classList.add('text-on-surface-variant', 'border-transparent');
                                });
                                btn.classList.remove('text-on-surface-variant', 'border-transparent');
                                btn.classList.add('active', 'text-primary', 'border-primary');

                                // Toggle content views
                                adminTabContents.forEach(c => c.classList.add('hidden'));
                                document.getElementById(`admin-tab-${targetTab}`).classList.remove('hidden');
                        });
                });

                // Load all admin data
                async function loadAdminDashboardData() {
                        if (!adminToken) return;

                        try {
                                // Default values from current site content
                                const defaults = {
                                        hero_title: "Criando caminhos de leveza e propósito.",
                                        hero_desc: "Um espaço seguro e acolhedor para o seu processo terapêutico. Atendimento online para todo o Brasil e brasileiros no exterior.",
                                        hero_img: "assets/ester-hero.jpg",
                                        about_title: "Muito prazer!",
                                        about_img: "https://lh3.googleusercontent.com/aida-public/AB6AXuA0Cy4cegf_snE5C1lWCj6vZyxTWNruYAHk1UnxpSUYuTd0l9nVbA4BCI-a9DppeiXPivkhUuaA3ed1CGoTad1anEbbQ1TOiYfI7Ak2SQ6TQP5Kz22exuTCIn2FI85DzQC5A4z54pAcLDneiPXUBM9C9pw_AdaLdVfGpHbgQYEp60Bj8QWOEQ4HgvDXUy9woCAV6nP-8GEmE3lP8g5ZcynTdtK4XlFCSKFcnwVkkvmuEyY8emuRVEnroSI1X33fdPPbOfxMjTnkHe8",
                                        about_content: "<p class=\"\">Sou psicóloga, mas não só isso. Minha bagagem também passa pela comunicação, mídias sociais e pela paixão por processos criativos.</p><p class=\"\">Tenho prática clínica e na saúde, com mulheres e público 60+.</p><p class=\"\">Acredito que viver é um percurso em construção. Que nenhuma história é reta, nenhuma dor é definitiva e nenhum caminho é percorrido sozinho. Que transformar não é apagar marcas, mas ressignificá-las.</p><p class=\"\">Escolho uma psicologia que não encaixa pessoas em moldes, mas as convida a florescer no próprio ritmo. Meu propósito é criar caminhos de leveza, onde cada passo, mesmo difícil, possa carregar sentido, presença e esperança.</p>",
                                        about_footer: "Formada pela Faculdade Estácio de Sá • Pós-graduanda",
                                        como_img: "https://lh3.googleusercontent.com/aida-public/AB6AXuD1q1s6Bs0SjJl0vqC0gPmw_KcZVLo4ScjL7_W9K1uYcgYZcAvX0TYhLxRU4yI7vsB20ICCFoDd3kgG1AfZbCH0KVe8UmdCbV2lGCbOGUKj7dW3_W8iIPawUT1LJoiwkNhq7DwZIOmwi0C8aXbJ8Uxd7dEecaSoTRvnbJmB2kBk4YuUVulJe0Da1OV1yRXTGzYIcbqkJuiAYak9u4hDd2olL4CTHwgGGOOCIQtUTRLIylzU1Lt06oEn358IgL6UqzwI1wblqXv4qEg",
                                        dif_img: "assets/ester-por-que-escolher.jpg",
                                        valor_sessao: "80,00",
                                        valor_mensal: "300,00",
                                        valores_img: "assets/ester-valores.jpg"
                                };

                                // Load from API, then override with localStorage
                                let c = {};
                                try {
                                        const contentRes = await fetch(`${API_BASE_URL}/admin/site-content`);
                                        if (contentRes.ok) c = await contentRes.json();
                                } catch (e) {}
                                Object.keys(defaults).forEach(key => {
                                        if (!c[key]) {
                                                const stored = localStorage.getItem(`site_content_${key}`);
                                                c[key] = stored || defaults[key];
                                        }
                                });

                                adminContentHeroTitle.value = c.hero_title;
                                adminContentHeroDesc.value = c.hero_desc;
                                setPreview('preview-hero-img', c.hero_img);
                                adminContentAboutTitle.value = c.about_title;
                                setPreview('preview-about-img', c.about_img);
                                adminContentAboutContent.value = c.about_content;
                                adminContentAboutFooter.value = c.about_footer;
                                setPreview('preview-como-img', c.como_img);
                                setPreview('preview-dif-img', c.dif_img);
                                adminContentValorSessao.value = c.valor_sessao;
                                adminContentValorMensal.value = c.valor_mensal;
                                setPreview('preview-valores-img', c.valores_img);

                                // Load Ebooks for Tab 2
                                loadAdminPDFList();

                                // Load Blog for Tab 3
                                renderBlogList();

                                // Load Pages for Tab 4
                                renderTestimonialsList();
                                renderFaqList();

                                // Load Agendas for Tab 5
                                renderAdminAgendas();

                                // Load Leads for Tab 6
                                renderAdminLeads();

                                // Load Globals for Tab 7
                                loadGlobals();

                        } catch (e) {
                                Logger.error("Erro ao carregar painel de administração", e);
                        }
                        // Always load from localStorage as supplement
                        renderBlogList();
                        renderTestimonialsList();
                        renderFaqList();
                        loadGlobals();
                        // Load image previews from localStorage
                        ['hero-img','about-img','como-img','dif-img','valores-img'].forEach(key => {
                                const stored = localStorage.getItem(`site_content_${key}`);
                                if (stored) setPreview(`preview-${key}`, stored);
                        });
                }

                // 5. Admin Content Updates (reads uploaded files as base64)
                adminSaveContentBtn.addEventListener('click', async () => {
                        const [heroImg, aboutImg, comoImg, difImg, valoresImg] = await Promise.all([
                                getFileFromInput('admin-content-hero-img'),
                                getFileFromInput('admin-content-about-img'),
                                getFileFromInput('admin-content-como-img'),
                                getFileFromInput('admin-content-dif-img'),
                                getFileFromInput('admin-content-valores-img')
                        ]);

                        const payload = [
                                { key: "hero_title", value: adminContentHeroTitle.value },
                                { key: "hero_desc", value: adminContentHeroDesc.value },
                                { key: "hero_img", value: heroImg || document.getElementById('preview-hero-img')?.src || '' },
                                { key: "about_title", value: adminContentAboutTitle.value },
                                { key: "about_img", value: aboutImg || document.getElementById('preview-about-img')?.src || '' },
                                { key: "about_content", value: adminContentAboutContent.value },
                                { key: "about_footer", value: adminContentAboutFooter.value },
                                { key: "como_img", value: comoImg || document.getElementById('preview-como-img')?.src || '' },
                                { key: "dif_img", value: difImg || document.getElementById('preview-dif-img')?.src || '' },
                                { key: "valor_sessao", value: adminContentValorSessao.value },
                                { key: "valor_mensal", value: adminContentValorMensal.value },
                                { key: "valores_img", value: valoresImg || document.getElementById('preview-valores-img')?.src || '' }
                        ];

                        try {
                                const res = await fetch(`${API_BASE_URL}/admin/site-content`, {
                                        method: 'POST',
                                        headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${adminToken}`
                                        },
                                        body: JSON.stringify(payload)
                                });

                                if (res.ok) {
                                        showToast("Conteúdo atualizado com sucesso!", "check_circle");
                                } else {
                                        payload.forEach(p => localStorage.setItem(`site_content_${p.key}`, p.value));
                                        showToast("Salvo localmente!", "check_circle");
                                }
                        } catch (e) {
                                payload.forEach(p => localStorage.setItem(`site_content_${p.key}`, p.value));
                                showToast("Salvo localmente!", "check_circle");
                        }
                        loadSiteData();
                });

                // TAB 2: PDF/Ebooks Management
                async function loadAdminPDFList() {
                        try {
                                const res = await fetch(`${API_BASE_URL}/admin/pdf-products`);
                                if (res.ok) {
                                        const products = await res.json();
                                        renderAdminPDFList(products);
                                        return;
                                }
                        } catch (e) {}
                        // Fallback: localStorage
                        const products = JSON.parse(localStorage.getItem('site_products') || '[]');
                        renderAdminPDFList(products);
                }

                function renderAdminPDFList(products) {
                        if (products.length === 0) {
                                adminPdfListContainer.innerHTML = `<p class="italic text-on-surface-variant text-sm py-4">Nenhum material cadastrado ainda.</p>`;
                                return;
                        }

                        adminPdfListContainer.innerHTML = products.map(p => `
                                <div class="p-4 bg-surface-container rounded-lg border border-outline-variant/30 flex justify-between items-center mb-3">
                                        <div>
                                                <h5 class="font-bold text-sm text-on-surface">${p.title}</h5>
                                                <p class="text-xs text-on-surface-variant line-clamp-1">${p.description || ''}</p>
                                                <p class="text-xs text-primary font-bold mt-1">R$ ${p.price.toFixed(2)} | Link: ${p.payment_link ? 'Definido' : 'Não definido'}</p>
                                        </div>
                                        <div class="flex gap-2">
                                                <button class="px-3 py-1 bg-primary text-on-primary rounded text-xs edit-pdf-btn" data-p='${JSON.stringify(p).replace(/'/g, "&#39;")}'>Editar</button>
                                                <button class="px-3 py-1 bg-red-600 text-white rounded text-xs delete-pdf-btn" data-id="${p.id}">Excluir</button>
                                        </div>
                                </div>
                        `).join('');

                        // Bind list edit/delete buttons
                        document.querySelectorAll('.edit-pdf-btn').forEach(btn => {
                                btn.addEventListener('click', () => {
                                        const p = JSON.parse(btn.getAttribute('data-p'));
                                        adminPdfFormContainer.classList.remove('hidden');
                                        adminPdfFormTitle.innerText = "Editar Material";
                                        adminPdfIdInput.value = p.id;
                                        adminPdfTitleInput.value = p.title;
                                        adminPdfPriceInput.value = p.price;
                                        adminPdfDescInput.value = p.description;
                                        adminPdfPaymentLinkInput.value = p.payment_link;
                                        if (adminPdfIconInput) adminPdfIconInput.value = p.icon || 'auto_stories';
                                });
                        });

                        document.querySelectorAll('.delete-pdf-btn').forEach(btn => {
                                btn.addEventListener('click', async () => {
                                        const id = btn.getAttribute('data-id');
                                        if (confirm("Deseja realmente excluir este material?")) {
                                                try {
                                                        const res = await fetch(`${API_BASE_URL}/admin/pdf-products/${id}`, {
                                                                method: 'DELETE',
                                                                headers: { 'Authorization': `Bearer ${adminToken}` }
                                                        });
                                                        if (res.ok) {
                                                                showToast("Material excluído!", "check_circle");
                                                                loadAdminPDFList();
                                                                return;
                                                        }
                                                } catch (e) {}
                                                // Fallback: localStorage
                                                let products = JSON.parse(localStorage.getItem('site_products') || '[]');
                                                products = products.filter(p => p.id != id);
                                                localStorage.setItem('site_products', JSON.stringify(products));
                                                showToast("Material excluído!", "check_circle");
                                                loadAdminPDFList();
                                        }
                                });
                        });
                }

                adminAddPdfBtn.addEventListener('click', () => {
                        adminPdfFormContainer.classList.remove('hidden');
                        adminPdfFormTitle.innerText = "Adicionar Novo Material";
                        adminPdfIdInput.value = "";
                        adminPdfTitleInput.value = "";
                        adminPdfPriceInput.value = "";
                        adminPdfDescInput.value = "";
                        if (adminPdfIconInput) adminPdfIconInput.value = "auto_stories";
                        adminPdfPaymentLinkInput.value = "";
                });

                adminPdfCancelBtn.addEventListener('click', () => {
                        adminPdfFormContainer.classList.add('hidden');
                });

                adminPdfSaveBtn.addEventListener('click', async () => {
                        const id = adminPdfIdInput.value;
                        const payload = {
                                title: adminPdfTitleInput.value,
                                description: adminPdfDescInput.value,
                                price: parseFloat(adminPdfPriceInput.value),
                                payment_link: adminPdfPaymentLinkInput.value,
                                icon: adminPdfIconInput ? adminPdfIconInput.value : 'auto_stories',
                                is_active: true
                        };

                        if (!payload.title || !payload.price || !payload.payment_link) {
                                showToast("Preencha título, preço e link de venda.", "warning");
                                return;
                        }

                        const url = id ? `${API_BASE_URL}/admin/pdf-products/${id}` : `${API_BASE_URL}/admin/pdf-products`;
                        const method = id ? 'PUT' : 'POST';

                        try {
                                const res = await fetch(url, {
                                        method: method,
                                        headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${adminToken}`
                                        },
                                        body: JSON.stringify(payload)
                                });

                                if (res.ok) {
                                        showToast("Material salvo com sucesso!", "check_circle");
                                } else {
                                        // Fallback: save to localStorage
                                        let products = JSON.parse(localStorage.getItem('site_products') || '[]');
                                        if (id) {
                                                const idx = products.findIndex(p => p.id == id);
                                                if (idx >= 0) products[idx] = { ...products[idx], ...payload };
                                        } else {
                                                payload.id = Date.now();
                                                products.push(payload);
                                        }
                                        localStorage.setItem('site_products', JSON.stringify(products));
                                        showToast("Salvo localmente!", "check_circle");
                                }
                        } catch (e) {
                                let products = JSON.parse(localStorage.getItem('site_products') || '[]');
                                if (id) {
                                        const idx = products.findIndex(p => p.id == id);
                                        if (idx >= 0) products[idx] = { ...products[idx], ...payload };
                                } else {
                                        payload.id = Date.now();
                                        products.push(payload);
                                }
                                localStorage.setItem('site_products', JSON.stringify(products));
                                showToast("Salvo localmente!", "check_circle");
                        }
                        adminPdfFormContainer.classList.add('hidden');
                        loadAdminPDFList();
                });

                // ==========================================
                // BLOG MANAGEMENT
                // ==========================================
                adminAddBlogBtn.addEventListener('click', () => {
                        adminBlogFormContainer.classList.remove('hidden');
                        adminBlogFormTitle.innerText = 'Novo Artigo';
                        adminBlogIdInput.value = '';
                        adminBlogTitleInput.value = '';
                        adminBlogCategoryInput.value = 'curadoria';
                        adminBlogDateInput.value = new Date().toISOString().split('T')[0];
                        adminBlogExcerptInput.value = '';
                        adminBlogContentInput.value = '';
                        setPreview('preview-blog-image', 'assets/ester-blog.jpg');
                        adminBlogImageInput.value = '';
                });

                adminBlogCancelBtn.addEventListener('click', () => {
                        adminBlogFormContainer.classList.add('hidden');
                });

                adminBlogSaveBtn.addEventListener('click', async () => {
                        const id = adminBlogIdInput.value;
                        const blogImg = await getFileFromInput('admin-blog-image');
                        const post = {
                                title: adminBlogTitleInput.value,
                                category: adminBlogCategoryInput.options[adminBlogCategoryInput.selectedIndex].text,
                                category_key: adminBlogCategoryInput.value,
                                date: adminBlogDateInput.value,
                                excerpt: adminBlogExcerptInput.value,
                                content: adminBlogContentInput.value,
                                image: blogImg || document.getElementById('preview-blog-image')?.src || 'assets/ester-blog.jpg'
                        };

                        if (!post.title || !post.content) {
                                showToast("Título e conteúdo são obrigatórios.", "warning");
                                return;
                        }

                        let posts = loadBlogPosts();
                        if (id !== '') {
                                posts[parseInt(id)] = post;
                        } else {
                                posts.push(post);
                        }
                        saveBlogPosts(posts);
                        renderBlogList();
                        adminBlogFormContainer.classList.add('hidden');
                        showToast("Artigo salvo com sucesso!", "check_circle");
                });

                // ==========================================
                // PAGES: TESTIMONIALS & FAQ
                // ==========================================
                adminAddTestimonialBtn.addEventListener('click', () => {
                        const name = prompt('Nome do paciente:');
                        if (!name) return;
                        const text = prompt('Texto do depoimento:');
                        if (!text) return;
                        const type = prompt('Tipo (ex: Terapia Online, Terapia Presencial):', 'Terapia Online');
                        let items = loadTestimonials();
                        items.push({ name, text, type: type || 'Terapia Online' });
                        saveTestimonials(items);
                        renderTestimonialsList();
                        showToast('Depoimento adicionado!', 'check_circle');
                });

                adminAddFaqBtn.addEventListener('click', () => {
                        const question = prompt('Pergunta:');
                        if (!question) return;
                        const answer = prompt('Resposta:');
                        if (!answer) return;
                        let items = loadFaq();
                        items.push({ question, answer });
                        saveFaq(items);
                        renderFaqList();
                        showToast('Pergunta adicionada!', 'check_circle');
                });

                adminSavePagesBtn.addEventListener('click', () => {
                        showToast('Depoimentos e FAQ salvos!', 'check_circle');
                });

                // ==========================================
                // GLOBALS
                // ==========================================
                adminSaveGlobalsBtn.addEventListener('click', () => {
                        const globals = {
                                whatsapp: adminGlobalWhatsapp.value,
                                email: adminGlobalEmail.value,
                                phone: adminGlobalPhone.value,
                                address: adminGlobalAddress.value,
                                instagram: adminGlobalInstagram.value,
                                other_social: adminGlobalOtherSocial.value,
                                logo: adminGlobalLogo.value,
                                ebooks_cta_text: adminGlobalEbooksCtaText.value
                        };
                        localStorage.setItem('site_globals', JSON.stringify(globals));
                        showToast('Configurações globais salvas!', 'check_circle');
                });

                // ==========================================
                // AGENDAS (LINA Appointments)
                // ==========================================
                async function renderAdminAgendas() {
                        let appointments = [];
                        try {
                                const res = await fetch(`${API_BASE_URL}/appointments`);
                                if (res.ok) appointments = await res.json();
                        } catch (e) {}
                        // Supplement with localStorage
                        const local = JSON.parse(localStorage.getItem('user_appointments') || '[]');
                        local.forEach(a => {
                                if (!appointments.some(x => x.id === a.id)) appointments.push(a);
                        });

                        const statsEl = document.getElementById('admin-agendas-stats');
                        const listEl = document.getElementById('admin-agendas-list');
                        if (!statsEl || !listEl) return;

                        const total = appointments.length;
                        const pending = appointments.filter(a => a.status === 'pending' || !a.status).length;
                        const confirmed = appointments.filter(a => a.status === 'confirmed').length;
                        const cancelled = appointments.filter(a => a.status === 'cancelled').length;

                        statsEl.innerHTML = `
                                <div class="p-3 bg-surface-container rounded-lg border border-outline-variant/30 text-center">
                                        <p class="text-2xl font-bold text-primary">${total}</p>
                                        <p class="text-[10px] text-on-surface-variant uppercase">Total</p>
                                </div>
                                <div class="p-3 bg-amber-50 rounded-lg border border-amber-200 text-center">
                                        <p class="text-2xl font-bold text-amber-600">${pending}</p>
                                        <p class="text-[10px] text-amber-600 uppercase">Pendentes</p>
                                </div>
                                <div class="p-3 bg-green-50 rounded-lg border border-green-200 text-center">
                                        <p class="text-2xl font-bold text-green-600">${confirmed}</p>
                                        <p class="text-[10px] text-green-600 uppercase">Confirmadas</p>
                                </div>
                                <div class="p-3 bg-red-50 rounded-lg border border-red-200 text-center">
                                        <p class="text-2xl font-bold text-red-600">${cancelled}</p>
                                        <p class="text-[10px] text-red-600 uppercase">Canceladas</p>
                                </div>
                        `;

                        if (appointments.length === 0) {
                                listEl.innerHTML = '<p class="italic text-on-surface-variant text-sm py-4">Nenhuma agenda registrada ainda.</p>';
                                return;
                        }

                        listEl.innerHTML = appointments.sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at)).map(a => {
                                const statusColor = a.status === 'confirmed' ? 'bg-green-100 text-green-800' : a.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800';
                                const statusText = a.status === 'confirmed' ? 'Confirmada' : a.status === 'cancelled' ? 'Cancelada' : 'Pendente';
                                return `
                                        <div class="p-4 bg-surface-container rounded-lg border border-outline-variant/30">
                                                <div class="flex justify-between items-start mb-2">
                                                        <div>
                                                                <p class="font-bold text-sm text-on-surface">${a.name || a.patient_name || 'Sem nome'}</p>
                                                                <p class="text-xs text-on-surface-variant">${a.email || ''} ${a.phone ? '• ' + a.phone : ''}</p>
                                                        </div>
                                                        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${statusColor}">${statusText}</span>
                                                </div>
                                                <div class="flex flex-wrap gap-3 text-xs text-on-surface-variant">
                                                        <span class="flex items-center gap-1"><span class="material-symbols-outlined text-xs">calendar_today</span>${a.date || 'Sem data'}</span>
                                                        <span class="flex items-center gap-1"><span class="material-symbols-outlined text-xs">schedule</span>${a.time || 'Sem horário'}</span>
                                                        ${a.type ? `<span class="flex items-center gap-1"><span class="material-symbols-outlined text-xs">category</span>${a.type}</span>` : ''}
                                                </div>
                                                ${a.message ? `<p class="text-xs text-on-surface-variant mt-2 italic">"${a.message}"</p>` : ''}
                                        </div>
                                `;
                        }).join('');
                }

                // ==========================================
                // LEADS (Waitlist + Form Submissions)
                // ==========================================
                function renderAdminLeads() {
                        const leads = JSON.parse(localStorage.getItem('waitlist_submissions') || '[]');
                        const statsEl = document.getElementById('admin-leads-stats');
                        const listEl = document.getElementById('admin-leads-list');
                        if (!statsEl || !listEl) return;

                        const total = leads.length;
                        const today = new Date().toISOString().split('T')[0];
                        const todayCount = leads.filter(l => l.date === today || l.submitted_at?.startsWith(today)).length;

                        statsEl.innerHTML = `
                                <div class="p-3 bg-surface-container rounded-lg border border-outline-variant/30 text-center">
                                        <p class="text-2xl font-bold text-primary">${total}</p>
                                        <p class="text-[10px] text-on-surface-variant uppercase">Total de Leads</p>
                                </div>
                                <div class="p-3 bg-blue-50 rounded-lg border border-blue-200 text-center">
                                        <p class="text-2xl font-bold text-blue-600">${todayCount}</p>
                                        <p class="text-[10px] text-blue-600 uppercase">Hoje</p>
                                </div>
                                <div class="p-3 bg-surface-container rounded-lg border border-outline-variant/30 text-center">
                                        <p class="text-2xl font-bold text-secondary">${leads.filter(l => l.type === 'waitlist').length}</p>
                                        <p class="text-[10px] text-on-surface-variant uppercase">Lista de Espera</p>
                                </div>
                        `;

                        if (leads.length === 0) {
                                listEl.innerHTML = '<p class="italic text-on-surface-variant text-sm py-4">Nenhum lead capturado ainda.</p>';
                                return;
                        }

                        listEl.innerHTML = leads.sort((a, b) => new Date(b.submitted_at || b.date || 0) - new Date(a.submitted_at || a.date || 0)).map(l => `
                                <div class="p-4 bg-surface-container rounded-lg border border-outline-variant/30">
                                        <div class="flex justify-between items-start mb-2">
                                                <div>
                                                        <p class="font-bold text-sm text-on-surface">${l.name || l.nome || 'Sem nome'}</p>
                                                        <p class="text-xs text-on-surface-variant">${l.email || ''} ${l.phone || l.whatsapp ? '• ' + (l.phone || l.whatsapp) : ''}</p>
                                                </div>
                                                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">${l.type || 'lead'}</span>
                                        </div>
                                        <div class="flex flex-wrap gap-3 text-xs text-on-surface-variant">
                                                <span class="flex items-center gap-1"><span class="material-symbols-outlined text-xs">calendar_today</span>${l.date || l.submitted_at?.split('T')[0] || 'Sem data'}</span>
                                                ${l.age ? `<span class="flex items-center gap-1"><span class="material-symbols-outlined text-xs">person</span>${l.age} anos</span>` : ''}
                                                ${l.location ? `<span class="flex items-center gap-1"><span class="material-symbols-outlined text-xs">location_on</span>${l.location}</span>` : ''}
                                        </div>
                                        ${l.message || l.mensagem ? `<p class="text-xs text-on-surface-variant mt-2 italic">"${l.message || l.mensagem}"</p>` : ''}
                                </div>
                        `).join('');
                }

                // Load live data on initialization
                loadSiteData();
                loadProducts();

                // Cal.com embed removido para priorizar agendamento local integrado com a IA.