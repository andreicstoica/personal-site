<script lang="ts">
  import type { NavItem } from "../../lib/navLinks";

  let {
    mainNavItems,
    socialNavItems,
  }: {
    mainNavItems: NavItem[];
    socialNavItems: NavItem[];
  } = $props();

  let desktopSocialPinned = $state(false);
  let desktopSocialOpen = $state(false);
  let mobileMenuOpen = $state(false);
  let mobileSocialOpen = $state(false);
  let desktopSocialEl = $state<HTMLDivElement | null>(null);

  const drawerCloseMs = 280;
  let mobileMenuHidden = $state(true);
  let hideTimer: ReturnType<typeof setTimeout> | undefined;

  const setDesktopSocialOpen = (open: boolean) => {
    desktopSocialOpen = open;
  };

  const toggleDesktopSocial = (event: MouseEvent) => {
    event.stopPropagation();
    desktopSocialPinned = !desktopSocialPinned;
    setDesktopSocialOpen(desktopSocialPinned);
  };

  const openMobileMenu = () => {
    if (hideTimer) clearTimeout(hideTimer);
    mobileMenuHidden = false;
    requestAnimationFrame(() => {
      mobileMenuOpen = true;
    });
  };

  const closeMobileMenu = () => {
    mobileMenuOpen = false;
    hideTimer = setTimeout(() => {
      mobileMenuHidden = true;
    }, drawerCloseMs);
  };

  $effect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (
        desktopSocialPinned &&
        event.target instanceof Node &&
        desktopSocialEl &&
        !desktopSocialEl.contains(event.target)
      ) {
        desktopSocialPinned = false;
        setDesktopSocialOpen(false);
      }
    };

    document.addEventListener("click", onDocumentClick);
    return () => {
      document.removeEventListener("click", onDocumentClick);
      if (hideTimer) clearTimeout(hideTimer);
    };
  });
</script>

<nav
  class="full-bleed relative z-50 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-bg-primary)] py-4 flex justify-between items-center"
>
  <div class="text-2xl text-[#fefefe] font-bold tracking-tight">
    <a href="/" class="hover:opacity-90 nav-name">Andrei Stoica</a>
  </div>

  <div class="hidden md:flex items-end gap-2 text-end">
    {#each mainNavItems as item}
      <a href={item.href} class="nav-box">
        <span class="nav-label">{item.label}</span>
      </a>
    {/each}

    <div
      bind:this={desktopSocialEl}
      class="relative"
      role="group"
      onmouseenter={() => {
        if (!desktopSocialPinned) setDesktopSocialOpen(true);
      }}
      onmouseleave={() => {
        if (!desktopSocialPinned) setDesktopSocialOpen(false);
      }}
    >
      <button
        type="button"
        aria-expanded={desktopSocialOpen}
        aria-haspopup="true"
        class="nav-box flex items-center gap-1"
        onclick={toggleDesktopSocial}
      >
        <span class="nav-label">Social</span>
        <span
          class="social-dropdown-arrow text-sm translate-y-[1px]"
          class:is-open={desktopSocialOpen}>⇣</span
        >
      </button>

      <div
        class="social-dropdown-menu absolute top-full right-0 pt-1 z-50 min-w-[10vw]"
        class:is-open={desktopSocialOpen}
      >
        <div class="social-dropdown-panel bg-[var(--color-bg-primary)] shadow-lg">
          {#each socialNavItems as item}
            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              class="nav-box w-full h-12 flex items-center justify-end nav-label"
            >
              {item.label}
            </a>
          {/each}
        </div>
      </div>
    </div>
  </div>

  <div class="md:hidden">
    <button
      class="text-[var(--color-text-primary)] p-2 hover:opacity-80 transition-opacity nav-pressable"
      aria-label="Toggle menu"
      onclick={openMobileMenu}
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 6h16M4 12h16M4 18h16"
        ></path>
      </svg>
    </button>
  </div>
</nav>

<div
  class="mobile-menu-overlay fixed inset-0 bg-black/50 z-50 md:hidden"
  class:hidden={mobileMenuHidden}
  class:is-open={mobileMenuOpen}
>
  <div
    class="mobile-menu-drawer absolute top-0 right-0 h-full w-80 bg-[var(--color-bg-primary)] shadow-lg transform"
    class:translate-x-full={!mobileMenuOpen}
  >
    <div class="p-6">
      <button
        class="absolute top-4 right-4 text-[var(--color-text-primary)] hover:opacity-70"
        aria-label="Close menu"
        onclick={closeMobileMenu}
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          ></path>
        </svg>
      </button>

      <div class="mt-8 space-y-4">
        {#each mainNavItems as item}
          <a
            href={item.href}
            class="mobile-menu-link block py-3 px-4 text-[var(--color-text-primary)] hover:bg-[var(--color-primary)] hover:text-[#fefefe] rounded"
          >
            {item.label}
          </a>
        {/each}

        <div class="relative">
          <button
            type="button"
            class="mobile-menu-link w-full text-left py-3 px-4 text-[var(--color-text-primary)] hover:bg-[var(--color-primary)] hover:text-[#fefefe] rounded flex items-center justify-between"
            onclick={() => (mobileSocialOpen = !mobileSocialOpen)}
          >
            Social
            <span class="social-dropdown-arrow" class:is-open={mobileSocialOpen}>⇣</span>
          </button>
          <div class="social-submenu pl-4 mt-2" class:is-open={mobileSocialOpen}>
            <div class="social-submenu-inner space-y-2">
              {#each socialNavItems as item}
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="block py-2 px-4 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
                >
                  {item.label}
                </a>
              {/each}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
