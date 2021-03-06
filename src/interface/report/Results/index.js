import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import ReactTooltip from 'react-tooltip';
import Masonry from 'react-masonry-component';
import Toggle from 'react-toggle';
import { Trans, t } from '@lingui/macro';

import ChecklistIcon from 'interface/icons/Checklist';
import SuggestionIcon from 'interface/icons/Suggestion';
import ArmorIcon from 'interface/icons/Armor';
import StatisticsIcon from 'interface/icons/Statistics';

import lazyLoadComponent from 'common/lazyLoadComponent';
import makeWclUrl from 'common/makeWclUrl';
import { getResultTab } from 'interface/selectors/url/report';
import { hasPremium } from 'interface/selectors/user';
import ErrorBoundary from 'interface/common/ErrorBoundary';
import Ad from 'interface/common/Ad';
import WipefestLogo from 'interface/images/Wipefest-logo.png';
import STATISTIC_CATEGORY from 'interface/others/STATISTIC_CATEGORY';
import { i18n } from 'interface/RootLocalizationProvider';

import FightNavigationBar from '../FightNavigationBar';
import ResultsWarning from './ResultsWarning';
import Header from './Header';
import DetailsTabPanel from './DetailsTabPanel';
import About from './About';
import StatisticsSectionTitle from './StatisticsSectionTitle';
import SuggestionsTab from './SuggestionsTab';
import './Results.css';

const DevelopmentTab = lazyLoadComponent(() => import(/* webpackChunkName: 'DevelopmentTab' */ 'interface/others/DevelopmentTab').then(exports => exports.default));
const EventsTab = lazyLoadComponent(() => import(/* webpackChunkName: 'EventsTab' */ 'interface/others/EventsTab').then(exports => exports.default));

const MAIN_TAB = {
  CHECKLIST: 'CHECKLIST',
  SUGGESTIONS: 'SUGGESTIONS',
  CHARACTER: 'CHARACTER',
  STATS: 'STATS',
};

class Results extends React.PureComponent {
  static propTypes = {
    parser: PropTypes.object.isRequired,
    selectedDetailsTab: PropTypes.string,
    makeTabUrl: PropTypes.func.isRequired,
    premium: PropTypes.bool,
    characterProfile: PropTypes.shape({
      region: PropTypes.string.isRequired,
      thumbnail: PropTypes.string.isRequired,
    }),
  };
  static childContextTypes = {
    updateResults: PropTypes.func.isRequired,
    parser: PropTypes.object.isRequired,
  };
  getChildContext() {
    return {
      updateResults: this.forceUpdate.bind(this),
      parser: this.props.parser,
    };
  }
  static contextTypes = {
    config: PropTypes.object.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      mainTab: !props.parser._modules.checklist ? MAIN_TAB.SUGGESTIONS : MAIN_TAB.CHECKLIST,
      adjustForDowntime: false,
    };
  }

  componentDidUpdate() {
    ReactTooltip.rebuild();
  }

  renderMainTabLabel(tab) {
    switch (tab) {
      case MAIN_TAB.CHECKLIST:
        return (
          <>
            <ChecklistIcon /> <Trans>Checklist</Trans>
          </>
        );
      case MAIN_TAB.SUGGESTIONS:
        return (
          <>
            <SuggestionIcon /> <Trans>Suggestions</Trans>
          </>
        );
      case MAIN_TAB.CHARACTER:
        return (
          <>
            <ArmorIcon /> <Trans>Character</Trans>
          </>
        );
      case MAIN_TAB.STATS:
        return (
          <>
            <StatisticsIcon /> <Trans>Statistics</Trans>
          </>
        );
      default: return tab;
    }
  }
  renderFightDowntimeToggle() {
    return (
      <div className="toggle-control" style={{ marginTop: 5 }}>
        <Toggle
          defaultChecked={this.state.adjustForDowntime}
          icons={false}
          onChange={event => this.setState({ adjustForDowntime: event.target.checked })}
          id="adjust-for-downtime-toggle"
        />
        <label htmlFor="adjust-for-downtime-toggle">
          <Trans>Adjust statistics for <dfn data-tip={i18n._(t`Fight downtime is any forced downtime caused by fight mechanics or dying. Downtime caused by simply not doing anything is not included.`)}>fight downtime</dfn> (<dfn data-tip={i18n._(t`We're still working out the kinks of this feature, some modules might output weird results with this on. When we're finished this will be enabled by default.`)}>experimental</dfn>)</Trans>
        </label>
      </div>
    );
  }
  renderStatistics(statistics) {
    const parser = this.props.parser;

    const groups = statistics.reduce((obj, statistic) => {
      const category = statistic.props.category || 'Statistics';
      obj[category] = obj[category] || [];
      obj[category].push(statistic);
      return obj;
    }, {});

    return (
      <>
        {Object.keys(groups).map(name => {
          const statistics = groups[name];
          return (
            <React.Fragment key={name}>
              <StatisticsSectionTitle
                rightAddon={name === STATISTIC_CATEGORY.GENERAL && parser.hasDowntime && this.renderFightDowntimeToggle()}
              >
                {name}
              </StatisticsSectionTitle>

              <Masonry className="row statistics">
                {statistics.sort((a, b) => a.props.position - b.props.position)}
              </Masonry>
            </React.Fragment>
          );
        })}
      </>
    );
  }

  get warning() {
    const parser = this.props.parser;
    const boss = parser.boss;
    if (boss && boss.fight.resultsWarning) {
      return boss.fight.resultsWarning;
    }
    return null;
  }

  renderChecklist() {
    const parser = this.props.parser;
    const modules = parser._modules;
    return (
      modules.checklist ? (
        modules.checklist.render()
      ) : (
        <div className="item-divider" style={{ padding: '10px 22px' }}>
          <div className="alert alert-danger">
            The checklist for this spec is not yet available. We could use your help to add this. See <a href="https://github.com/WoWAnalyzer/WoWAnalyzer">GitHub</a> or join us on <a href="https://discord.gg/AxphPxU">Discord</a> if you're interested in contributing this.
          </div>
        </div>
      )
    );
  }
  renderContent() {
    const { parser, selectedDetailsTab, makeTabUrl, premium, characterProfile } = this.props;
    const report = parser.report;
    const fight = parser.fight;
    const modules = parser._modules;
    const config = this.context.config;

    const results = parser.generateResults({
      i18n, // TODO: Remove and use singleton
      adjustForDowntime: this.state.adjustForDowntime,
    });

    results.tabs.push({
      title: i18n._(t`Events`),
      url: 'events',
      order: 99999,
      render: () => (
        <EventsTab
          parser={parser}
        />
      ),
    });
    if (process.env.NODE_ENV === 'development') {
      results.tabs.push({
        title: i18n._(t`Development`),
        url: 'development',
        order: 100000,
        render: () => (
          <DevelopmentTab
            parser={parser}
            results={results}
          />
        ),
      });
    }

    return (
      <div key={this.state.adjustForDowntime}>
        <div className="row">
          <div className="col-md-4">
            <About config={config} />

            <div>
              <a
                href={makeWclUrl(report.code, { fight: fight.id, source: parser.playerId })}
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
                style={{ fontSize: 24 }}
                data-tip={i18n._(t`View the original report`)}
              >
                <img src="/img/wcl.png" alt="Warcraft Logs logo" style={{ height: '1.4em', marginTop: '-0.15em' }} /> Warcraft Logs
              </a>
              {' '}
              <a
                href={`https://www.wipefest.net/report/${report.code}/fight/${fight.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
                style={{ fontSize: 24 }}
                data-tip={i18n._(t`View insights and timelines for raid encounters`)}
              >
                <img src={WipefestLogo} alt="Wipefest logo" style={{ height: '1.4em', marginTop: '-0.15em' }} /> Wipefest
              </a>
              {' '}
              {characterProfile && characterProfile.realm && characterProfile.name && characterProfile.region && (
                <Link 
                  to={`/character/${characterProfile.region.toUpperCase()}/${characterProfile.realm}/${characterProfile.name}/`} 
                  data-tip={`View ${characterProfile.realm} - ${characterProfile.name}'s most recent reports`}
                  className="btn"
                  style={{ fontSize: 24 }}
                >
                  <img src="/favicon.png" alt="WoWAnalyzer logo" style={{ height: '1.4em', marginTop: '-0.15em' }} /> {characterProfile.name}
                </Link>
              )}
            </div>
          </div>
          <div className="col-md-8">
            <div className="panel tabbed">
              <div className="panel-body flex" style={{ flexDirection: 'column', padding: '0' }}>
                <div className="navigation item-divider">
                  <div className="flex" style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {Object.values(MAIN_TAB).map(tab => (
                      <button
                        key={tab}
                        className={this.state.mainTab === tab ? 'btn-link selected' : 'btn-link'}
                        onClick={() => {
                          this.setState({
                            mainTab: tab,
                          });
                        }}
                      >
                        {this.renderMainTabLabel(tab)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <ResultsWarning warning={this.warning} />
                  <ErrorBoundary>
                    {this.state.mainTab === MAIN_TAB.CHECKLIST && this.renderChecklist()}
                    {this.state.mainTab === MAIN_TAB.SUGGESTIONS && <SuggestionsTab issues={results.issues} />}
                    {this.state.mainTab === MAIN_TAB.CHARACTER && modules.characterTab.render()}
                    {this.state.mainTab === MAIN_TAB.STATS && modules.encounterPanel.render()}
                  </ErrorBoundary>
                </div>
              </div>
            </div>
          </div>
        </div>

        {!premium && (
          <div className="text-center" style={{ marginTop: 40, marginBottom: -40 }}>
            <Ad format="leaderboard" />
          </div>
        )}

        {this.renderStatistics(results.statistics)}

        {!premium && (
          <div className="text-center" style={{ marginTop: 40, marginBottom: -40 }}>
            <Ad format="leaderboard" />
          </div>
        )}

        <StatisticsSectionTitle>
          <Trans>Details</Trans>
        </StatisticsSectionTitle>

        <DetailsTabPanel
          tabs={results.tabs}
          selected={selectedDetailsTab}
          makeTabUrl={makeTabUrl}
        />
      </div>
    );
  }
  render() {
    const { parser, characterProfile } = this.props;
    const fight = parser.fight;
    const config = this.context.config;
    const modules = parser._modules;
    const selectedCombatant = modules.combatants.selected;

    return (
      <>
        {/* TODO: Put this in a higher component such as ConfigLoader to make it easier to switch fights early */}
        <FightNavigationBar />

        <div className="container">
          <div className="results">
            <Header
              config={config}
              playerName={selectedCombatant.name}
              playerIcon={characterProfile && characterProfile.thumbnail ? `https://render-${characterProfile.region}.worldofwarcraft.com/character/${characterProfile.thumbnail}` : null}
              boss={parser.boss}
              fight={fight}
            />

            {this.renderContent()}
          </div>
        </div>
      </>
    );
  }
}

const mapStateToProps = state => ({
  selectedDetailsTab: getResultTab(state),
  premium: hasPremium(state),
});

export default connect(
  mapStateToProps
)(Results);
