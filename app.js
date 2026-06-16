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

                // Blog "See all" click
                document.querySelectorAll('.blog-see-all').forEach(btn => {
                        btn.addEventListener('click', () => {
                                showToast("A curadoria de artigos estarÃ¡ disponÃ­vel em breve com materiais exclusivos!", "menu_book");
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
                        ? "http://127.0.0.1:8000/api"
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
                const adminContentAboutTitle = document.getElementById('admin-content-about-title');
                const adminContentAboutImg = document.getElementById('admin-content-about-img');
                const adminContentAboutContent = document.getElementById('admin-content-about-content');
                const adminContentAboutFooter = document.getElementById('admin-content-about-footer');
                const adminSaveContentBtn = document.getElementById('admin-save-content-btn');

                // PDF Products admin inputs & list
                const adminAddPdfBtn = document.getElementById('admin-add-pdf-btn');
                const adminPdfFormContainer = document.getElementById('admin-pdf-form-container');
                const adminPdfFormTitle = document.getElementById('admin-pdf-form-title');
                const adminPdfIdInput = document.getElementById('admin-pdf-id');
                const adminPdfTitleInput = document.getElementById('admin-pdf-title');
                const adminPdfPriceInput = document.getElementById('admin-pdf-price');
                const adminPdfDescInput = document.getElementById('admin-pdf-desc');
                const adminPdfPaymentLinkInput = document.getElementById('admin-pdf-payment-link');
                const adminPdfDownloadUrlInput = document.getElementById('admin-pdf-download-url');
                const adminPdfCancelBtn = document.getElementById('admin-pdf-cancel-btn');
                const adminPdfSaveBtn = document.getElementById('admin-pdf-save-btn');
                const adminPdfListContainer = document.getElementById('admin-pdf-list');

                // Sales history list
                const adminPurchasesTableBody = document.getElementById('admin-purchases-table-body');

                // Public PDF elements (removed - products now on Orbita)
                let adminToken = null;

                // 1. Load Dynamic Site Content
                async function loadSiteData() {
                        try {
                                const contentRes = await fetch(`${API_BASE_URL}/admin/site-content`);
                                if (contentRes.ok) {
                                        const contents = await contentRes.json();
                                        if (contents.hero_title) document.getElementById('hero-title').innerText = contents.hero_title;
                                        if (contents.hero_desc) document.getElementById('hero-desc').innerText = contents.hero_desc;
                                        if (contents.about_title) document.getElementById('about-title').innerText = contents.about_title;
                                        if (contents.about_img) document.getElementById('about-img').src = contents.about_img;
                                        if (contents.about_content) document.getElementById('about-content').innerHTML = contents.about_content;
                                        if (contents.about_footer) document.getElementById('about-footer').innerText = contents.about_footer;
                                }
                        } catch (e) {
                                Logger.error("Erro ao carregar dados dinÃ¢micos do site", e);
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
                                const headers = { 'Authorization': `Bearer ${adminToken}` };

                                // Load Content Tab Inputs
                                const contentRes = await fetch(`${API_BASE_URL}/admin/site-content`);
                                if (contentRes.ok) {
                                        const c = await contentRes.json();
                                        adminContentHeroTitle.value = c.hero_title || "Criando caminhos de leveza e propÃ³sito.";
                                        adminContentHeroDesc.value = c.hero_desc || "";
                                        adminContentAboutTitle.value = c.about_title || "Muito prazer!";
                                        adminContentAboutImg.value = c.about_img || "";
                                        adminContentAboutContent.value = c.about_content || "";
                                        adminContentAboutFooter.value = c.about_footer || "";
                                }

                                // Load PDF products for Tab 2
                                loadAdminPDFList();

                                // Load Purchases list for Tab 3
                                loadAdminPurchasesList();

                        } catch (e) {
                                Logger.error("Erro ao carregar painel de administraÃ§Ã£o", e);
                        }
                }

                // 5. Admin Content Updates
                adminSaveContentBtn.addEventListener('click', async () => {
                        const payload = [
                                { key: "hero_title", value: adminContentHeroTitle.value },
                                { key: "hero_desc", value: adminContentHeroDesc.value },
                                { key: "about_title", value: adminContentAboutTitle.value },
                                { key: "about_img", value: adminContentAboutImg.value },
                                { key: "about_content", value: adminContentAboutContent.value },
                                { key: "about_footer", value: adminContentAboutFooter.value }
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
                                        showToast("ConteÃºdo atualizado com sucesso!", "check_circle");
                                        loadSiteData(); // refresh live site layout
                                } else {
                                        showToast("Erro ao salvar alteraÃ§Ãµes.", "error");
                                }
                        } catch (e) {
                                showToast("Erro de conexÃ£o.", "wifi_off");
                        }
                });

                // TAB 2: PDF Management
                async function loadAdminPDFList() {
                        const res = await fetch(`${API_BASE_URL}/admin/pdf-products`);
                        if (res.ok) {
                                const products = await res.json();
                                renderAdminPDFList(products);
                        }
                }

                function renderAdminPDFList(products) {
                        if (products.length === 0) {
                                adminPdfListContainer.innerHTML = `<p class="italic text-on-surface-variant text-sm py-4">Nenhum PDF cadastrado ainda.</p>`;
                                return;
                        }

                        adminPdfListContainer.innerHTML = products.map(p => `
                                <div class="p-4 bg-surface-container rounded-lg border border-outline-variant/30 flex justify-between items-center mb-3">
                                        <div>
                                                <h5 class="font-bold text-sm text-on-surface">${p.title}</h5>
                                                <p class="text-xs text-on-surface-variant line-clamp-1">${p.description}</p>
                                                <p class="text-xs text-primary font-bold mt-1">R$ ${p.price.toFixed(2)} | Status: ${p.is_active ? 'Ativo' : 'Inativo'}</p>
                                        </div>
                                        <div class="flex gap-2">
                                                <button class="px-3 py-1 bg-primary text-on-primary rounded text-xs edit-pdf-btn" data-p='${JSON.stringify(p)}'>Editar</button>
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
                                        adminPdfDownloadUrlInput.value = p.download_url;
                                });
                        });

                        document.querySelectorAll('.delete-pdf-btn').forEach(btn => {
                                btn.addEventListener('click', async () => {
                                        const id = btn.getAttribute('data-id');
                                        if (confirm("Deseja realmente excluir este material?")) {
                                                const res = await fetch(`${API_BASE_URL}/admin/pdf-products/${id}`, {
                                                        method: 'DELETE',
                                                        headers: { 'Authorization': `Bearer ${adminToken}` }
                                                });
                                                if (res.ok) {
                                                        showToast("PDF excluÃ­do com sucesso!", "check_circle");
                                                        loadAdminPDFList();
                                                        loadSiteData();
                                                }
                                        }
                                });
                        });
                }

                adminAddPdfBtn.addEventListener('click', () => {
                        adminPdfFormContainer.classList.remove('hidden');
                        adminPdfFormTitle.innerText = "Adicionar Novo PDF";
                        adminPdfIdInput.value = "";
                        adminPdfTitleInput.value = "";
                        adminPdfPriceInput.value = "";
                        adminPdfDescInput.value = "";
                        adminPdfPaymentLinkInput.value = "";
                        adminPdfDownloadUrlInput.value = "";
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
                                download_url: adminPdfDownloadUrlInput.value,
                                is_active: true
                        };

                        if (!payload.title || !payload.price || !payload.payment_link || !payload.download_url) {
                                showToast("Por favor, preencha todos os campos obrigatÃ³rios.", "warning");
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
                                        showToast("PDF salvo com sucesso!", "check_circle");
                                        adminPdfFormContainer.classList.add('hidden');
                                        loadAdminPDFList();
                                        loadSiteData();
                                } else {
                                        showToast("Erro ao salvar o material.", "error");
                                }
                        } catch (e) {
                                showToast("Erro de rede.", "wifi_off");
                        }
                });

                // TAB 3: Purchases
                async function loadAdminPurchasesList() {
                        const res = await fetch(`${API_BASE_URL}/admin/purchases`, {
                                headers: { 'Authorization': `Bearer ${adminToken}` }
                        });
                        if (res.ok) {
                                const purchases = await res.json();
                                renderAdminPurchasesList(purchases);
                        }
                }

                function renderAdminPurchasesList(purchases) {
                        if (purchases.length === 0) {
                                adminPurchasesTableBody.innerHTML = `<tr><td colspan="5" class="p-4 text-center italic text-on-surface-variant">Nenhuma compra registrada ainda.</td></tr>`;
                                return;
                        }

                        adminPurchasesTableBody.innerHTML = purchases.map(p => `
                                <tr class="border-b border-outline-variant/30 hover:bg-surface-container-low">
                                        <td class="p-3 text-on-surface font-bold">${p.product_title}</td>
                                        <td class="p-3 text-on-surface-variant">${p.email}</td>
                                        <td class="p-3">
                                                <span class="px-2 py-0.5 rounded text-xs font-bold ${p.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}">
                                                        ${p.status === 'paid' ? 'Pago' : 'Pendente'}
                                                </span>
                                        </td>
                                        <td class="p-3 text-xs text-on-surface-variant">${new Date(p.created_at).toLocaleDateString()}</td>
                                        <td class="p-3 text-right">
                                                ${p.status === 'pending' ? `
                                                        <button class="px-3 py-1 bg-secondary text-on-secondary rounded text-xs font-bold confirm-purchase-btn cursor-pointer" data-id="${p.id}">
                                                                Confirmar Pagamento
                                                        </button>
                                                ` : '<span class="text-xs text-green-700 italic font-bold">E-mail Enviado</span>'}
                                        </td>
                                </tr>
                        `).join('');

                        // Bind payment confirmation simulation buttons
                        document.querySelectorAll('.confirm-purchase-btn').forEach(btn => {
                                btn.addEventListener('click', async () => {
                                        const id = btn.getAttribute('data-id');
                                        const res = await fetch(`${API_BASE_URL}/purchases/${id}/confirm`, { method: 'POST' });
                                        if (res.ok) {
                                                const data = await res.json();
                                                showToast("Pagamento confirmado! Link enviado por e-mail.", "check_circle");
                                                loadAdminPurchasesList();
                                        }
                                });
                        });
                }

                // Load live data on initialization
                loadSiteData();

                // Cal.com embed removido para priorizar agendamento local integrado com a IA.