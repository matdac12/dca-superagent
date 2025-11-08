"""
Console Logger with Rich

Beautiful console output for the Autonomous DCA System using Rich library.
Provides clean, colorful, and structured console output while keeping verbose logs in files.
"""
from typing import Dict, List, Optional
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn
from rich.text import Text
from rich import box


class ConsoleLogger:
    """Rich-based console logger for beautiful output"""

    def __init__(self):
        """Initialize Rich console"""
        self.console = Console()

    def print_banner(self, testnet: bool, dry_run: bool):
        """Print startup banner"""
        mode_parts = []
        if testnet:
            mode_parts.append("[yellow]🧪 TESTNET[/yellow]")
        else:
            mode_parts.append("[red]⚠️  PRODUCTION[/red]")

        if dry_run:
            mode_parts.append("[cyan](Dry Run)[/cyan]")

        mode_str = " ".join(mode_parts)

        banner = Panel(
            f"[bold cyan]🤖 AUTONOMOUS DCA AGENT SYSTEM[/bold cyan]\n{mode_str}",
            border_style="cyan",
            box=box.DOUBLE
        )
        self.console.print()
        self.console.print(banner)
        self.console.print()

    def print_stage_header(self, stage_num: int, stage_name: str, emoji: str = ""):
        """Print a stage header with panel"""
        title = f"{emoji} Stage {stage_num}: {stage_name}" if emoji else f"Stage {stage_num}: {stage_name}"
        panel = Panel(
            f"[bold magenta]{title}[/bold magenta]",
            border_style="magenta",
            box=box.ROUNDED
        )
        self.console.print(panel)

    def print_market_data(self, intelligence: Dict):
        """Print market data as a clean table"""
        portfolio = intelligence['portfolio']
        btc = intelligence['btc']
        ada = intelligence['ada']

        # Portfolio table
        portfolio_table = Table(title="Portfolio", box=box.SIMPLE, show_header=False)
        portfolio_table.add_column("Item", style="cyan")
        portfolio_table.add_column("Value", style="green", justify="right")

        portfolio_table.add_row("Total Value", f"${portfolio['total_value_usd']:,.2f}")
        portfolio_table.add_row("USDT", f"${portfolio['usdt']['total']:,.2f}")
        portfolio_table.add_row("BTC", f"{portfolio['btc']['total']:.8f} (${portfolio['btc']['value_usd']:,.2f})")
        portfolio_table.add_row("ADA", f"{portfolio['ada']['total']:,.2f} (${portfolio['ada']['value_usd']:,.2f})")

        # Market data table
        market_table = Table(title="Market Data", box=box.SIMPLE)
        market_table.add_column("Asset", style="cyan")
        market_table.add_column("Price", style="white", justify="right")
        market_table.add_column("24h Change", justify="right")
        market_table.add_column("RSI", justify="right")
        market_table.add_column("Signal", style="yellow")

        # BTC row
        btc_change_color = "green" if btc['change_24h'] >= 0 else "red"
        market_table.add_row(
            "BTC",
            f"${btc['price']:,.2f}",
            f"[{btc_change_color}]{btc['change_24h']:+.2f}%[/{btc_change_color}]",
            f"{btc['indicators']['rsi']:.1f}",
            btc['indicators']['rsi_signal']
        )

        # ADA row
        ada_change_color = "green" if ada['change_24h'] >= 0 else "red"
        market_table.add_row(
            "ADA",
            f"${ada['price']:.4f}",
            f"[{ada_change_color}]{ada['change_24h']:+.2f}%[/{ada_change_color}]",
            f"{ada['indicators']['rsi']:.1f}",
            ada['indicators']['rsi_signal']
        )

        self.console.print(portfolio_table)
        self.console.print()
        self.console.print(market_table)
        self.console.print()

    def print_research_plan(self, plan):
        """Print research plan summary"""
        self.console.print(f"[green]✓[/green] Generated [bold]{len(plan.searches)}[/bold] research queries")
        self.console.print(f"[cyan]Strategy Hint:[/cyan] {plan.strategy_hint}")
        self.console.print()

    def create_search_progress(self, total: int) -> Progress:
        """Create and return a progress bar for web searches"""
        progress = Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TaskProgressColumn(),
            console=self.console
        )
        return progress

    def print_strategy_options(self, strategy_options):
        """Print strategy options as a table"""
        table = Table(title="Strategic Options", box=box.SIMPLE)
        table.add_column("#", style="cyan", width=3)
        table.add_column("Strategy", style="white")
        table.add_column("Conviction", justify="center")
        table.add_column("BTC %", justify="right")
        table.add_column("ADA %", justify="right")

        for i, opt in enumerate(strategy_options.options, 1):
            conviction_color = "green" if opt.conviction >= 7 else "yellow" if opt.conviction >= 5 else "red"
            table.add_row(
                str(i),
                opt.strategy,
                f"[{conviction_color}]{opt.conviction}/10[/{conviction_color}]",
                f"{opt.btc_allocation_pct:.0f}%",
                f"{opt.ada_allocation_pct:.0f}%"
            )

        self.console.print(table)
        self.console.print()
        self.console.print(f"[cyan]Market Summary:[/cyan] {strategy_options.market_summary}")
        self.console.print()

    def print_decision(self, decision, selected_option):
        """Print final decision in a panel"""
        decision_text = f"""[bold]Strategy:[/bold] {selected_option.strategy}
[bold]Conviction:[/bold] [green]{selected_option.conviction}/10[/green]

[bold]Reasoning:[/bold]
{decision.reasoning}"""

        panel = Panel(
            decision_text,
            title=f"⚖️  Selected Option {decision.selected_option + 1}",
            border_style="green",
            box=box.ROUNDED
        )
        self.console.print(panel)
        self.console.print()

    def print_actions(self, actions: List[Dict]):
        """Print trading actions as a table"""
        if not actions:
            self.console.print("[yellow]📋 HOLD - No trades planned[/yellow]")
            self.console.print()
            return

        table = Table(title=f"Actions ({len(actions)})", box=box.SIMPLE)
        table.add_column("#", style="cyan", width=3)
        table.add_column("Type", style="yellow")
        table.add_column("Asset", style="white")
        table.add_column("Price", justify="right")
        table.add_column("Amount", justify="right", style="green")

        for i, action in enumerate(actions, 1):
            table.add_row(
                str(i),
                action['type'],
                action['asset'],
                f"${action['price']:,.4f}",
                f"${action['amount_usd']:,.2f}"
            )

        self.console.print(table)
        self.console.print()

    def print_validation_result(self, is_valid: bool, errors: List[str]):
        """Print validation result"""
        if is_valid:
            self.console.print("[green]✅ All actions passed safety validation[/green]")
        else:
            self.console.print(f"[red]❌ Safety validation failed with {len(errors)} error(s):[/red]")
            for error in errors:
                self.console.print(f"  [red]•[/red] {error}")
        self.console.print()

    def print_execution_result(self, execution_result: Dict):
        """Print execution results"""
        if execution_result.get('dry_run'):
            self.console.print("[cyan]🔍 DRY RUN - Skipping actual execution[/cyan]")
            self.console.print()
            return

        executed = execution_result['executed']
        failed = execution_result['failed']

        self.console.print(f"[green]✅ Executed:[/green] {executed}")
        self.console.print(f"[red]❌ Failed:[/red] {failed}")

        if execution_result.get('results'):
            self.console.print()
            for result in execution_result['results']:
                action = result['action']
                if result['success']:
                    order_id = result['order']['orderId']
                    self.console.print(f"[green]✓[/green] {action['type']} {action['asset']} - Order #{order_id}")
                else:
                    self.console.print(f"[red]✗[/red] {action['type']} {action['asset']} - {result['error'][:60]}")

        self.console.print()

    def print_verification(self, verification):
        """Print verification status"""
        # Use consistency_check as the status field
        status = verification.consistency_check
        status_color = "green" if status == "APPROVED" else "yellow" if status == "APPROVED_WITH_NOTES" else "red"

        self.console.print(f"[{status_color}]Status:[/{status_color}] {status}")

        if verification.issues:
            self.console.print(f"[yellow]Issues:[/yellow] {len(verification.issues)}")
            for issue in verification.issues[:3]:
                self.console.print(f"  [yellow]•[/yellow] {issue}")

        if verification.recommendations:
            self.console.print(f"[cyan]Recommendations:[/cyan]")
            for rec in verification.recommendations[:3]:
                self.console.print(f"  [cyan]•[/cyan] {rec}")

        self.console.print()

    def print_final_summary(self, report: Dict):
        """Print final summary panel"""
        success = report.get('success', False)
        duration = report['duration_seconds']
        decision = report['decision']
        actions_count = len(report['actions'])

        success_icon = "✅" if success else "❌"
        status_text = "COMPLETE" if success else "FAILED"
        status_color = "green" if success else "red"

        summary_text = f"""[{status_color}]{success_icon} {status_text}[/{status_color}]

[bold]Duration:[/bold] {duration:.1f}s
[bold]Strategy:[/bold] {decision['strategy_name']}
[bold]Conviction:[/bold] {decision['conviction']}/10
[bold]Actions:[/bold] {actions_count}"""

        if not report.get('dry_run'):
            execution = report['execution']
            summary_text += f"\n[bold]Executed:[/bold] {execution['executed']}"
            summary_text += f"\n[bold]Failed:[/bold] {execution['failed']}"

        verification = report['verification']
        summary_text += f"\n[bold]Verification:[/bold] {verification['status']}"

        panel = Panel(
            summary_text,
            title="Pipeline Summary",
            border_style=status_color,
            box=box.DOUBLE
        )
        self.console.print(panel)

    def print_success(self, message: str):
        """Print success message"""
        self.console.print(f"[green]✓[/green] {message}")

    def print_info(self, message: str):
        """Print info message"""
        self.console.print(f"[cyan]ℹ[/cyan] {message}")

    def print_warning(self, message: str):
        """Print warning message"""
        self.console.print(f"[yellow]⚠[/yellow] {message}")

    def print_error(self, message: str):
        """Print error message"""
        self.console.print(f"[red]✗[/red] {message}")

    def print(self, message: str = ""):
        """Print plain message"""
        self.console.print(message)
