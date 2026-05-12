import type { SwarmDefenseForecast } from '@/components/play/swarmVillage/model/types';
import { hudStyles } from '@/components/play/swarmVillage/styles/hud';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { RefObject } from 'react';
import { Image, Pressable, Text, View, type ImageSourcePropType } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

type SwarmVillageHudProps = {
  activateDisabled: boolean;
  activateSwarmLabel: string;
  activateSwarmSubtext: string;
  defenseForecast: SwarmDefenseForecast;
  displayedStarBalance: number;
  displayedSwarmStreak: number;
  dragActive: boolean;
  forestSpiritCharges: number;
  forestSpiritImageSource: ImageSourcePropType;
  forestSpiritProgress: number;
  forestSpiritProgressLoaded: boolean;
  forestSpiritRequiredDays: number;
  headerTitle: string;
  insetsTop: number;
  isHudCollapsed: boolean;
  onExitPress: () => void;
  onStartWave: () => void;
  onToggleCollapsed: () => void;
  onUseForestSpirit: () => void;
  remainingIjoms: number;
  swarmActive: boolean;
  swarmScheduleTourRef: RefObject<View | null>;
  starBalanceTargetRef: RefObject<View | null>;
  totalIjoms: number;
  starIconSource: ImageSourcePropType;
  waveLabel: string;
};

export default function SwarmVillageHud({
  activateDisabled,
  activateSwarmLabel,
  activateSwarmSubtext,
  defenseForecast,
  displayedStarBalance,
  displayedSwarmStreak,
  dragActive,
  forestSpiritCharges,
  forestSpiritImageSource,
  forestSpiritProgress,
  forestSpiritProgressLoaded,
  forestSpiritRequiredDays,
  headerTitle,
  insetsTop,
  isHudCollapsed,
  onExitPress,
  onStartWave,
  onToggleCollapsed,
  onUseForestSpirit,
  remainingIjoms,
  swarmActive,
  swarmScheduleTourRef,
  starBalanceTargetRef,
  totalIjoms,
  starIconSource,
  waveLabel,
}: SwarmVillageHudProps) {
  const swarmAvailable = !activateDisabled;
  const normalizedForecastChance = Math.max(0, Math.min(100, Math.round(defenseForecast.survivalChance)));
  const displayedWaveSize = swarmActive
    ? Math.max(1, Math.floor(totalIjoms))
    : Math.max(1, Math.floor(defenseForecast.nextWaveSize));
  const statusLine = swarmActive ? waveLabel : `Next wave: ${displayedWaveSize} Ijoms`;
  const forecastSuggestions = defenseForecast.suggestions.slice(0, 2);
  const forecastToneIcon =
    defenseForecast.level === 'danger'
      ? 'alert-circle'
      : defenseForecast.level === 'warning'
        ? 'warning'
        : 'shield-checkmark';
  const activateButtonText =
    swarmAvailable && (defenseForecast.level === 'danger' || defenseForecast.level === 'warning')
      ? 'Activate Anyway'
      : 'Activate Defenses';
  const expandedStatusTitle = swarmActive
    ? activateSwarmLabel
    : defenseForecast.readinessLabel;
  const expandedStatusSubtext = swarmActive
    ? activateSwarmSubtext
    : defenseForecast.summary;
  const forecastGradientColors = (
    defenseForecast.level === 'danger'
      ? ['rgba(69,10,10,0.98)', 'rgba(127,29,29,0.88)', 'rgba(15,23,42,0.94)']
      : defenseForecast.level === 'warning'
        ? ['rgba(67,20,7,0.98)', 'rgba(146,64,14,0.86)', 'rgba(15,23,42,0.94)']
        : defenseForecast.level === 'stable'
          ? ['rgba(8,47,73,0.98)', 'rgba(6,78,59,0.9)', 'rgba(15,23,42,0.92)']
          : ['rgba(6,78,59,0.98)', 'rgba(22,101,52,0.9)', 'rgba(15,23,42,0.92)']
  ) as [string, string, string];
  const normalizedForestSpiritRequiredDays = Math.max(1, Math.floor(forestSpiritRequiredDays));
  const normalizedForestSpiritProgress = forestSpiritProgressLoaded
    ? Math.max(0, Math.min(normalizedForestSpiritRequiredDays, Math.floor(forestSpiritProgress)))
    : 0;
  const forestSpiritReady = forestSpiritProgressLoaded && forestSpiritCharges > 0;
  const forestSpiritCircleDays = Math.max(0, normalizedForestSpiritRequiredDays - 1);
  const forestSpiritRewardVisible = normalizedForestSpiritProgress >= normalizedForestSpiritRequiredDays || forestSpiritReady;
  const normalizedTotalIjoms = Math.max(1, Math.floor(totalIjoms));
  const normalizedRemainingIjoms = Math.max(0, Math.min(normalizedTotalIjoms, Math.floor(remainingIjoms)));
  const swarmRemainingRatio = normalizedRemainingIjoms / normalizedTotalIjoms;
  const donutSize = 40;
  const donutStrokeWidth = 5;
  const donutRadius = (donutSize - donutStrokeWidth) / 2;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const donutDashOffset = donutCircumference * (1 - swarmRemainingRatio);

  return (
    <View style={[hudStyles.hud, { paddingTop: insetsTop + 8 }]} pointerEvents={dragActive ? 'none' : 'box-none'}>
      <Pressable
        accessibilityRole={isHudCollapsed ? 'button' : undefined}
        onPress={isHudCollapsed ? onToggleCollapsed : undefined}
        style={[
          hudStyles.hudCard,
          swarmAvailable && hudStyles.hudCardAvailable,
          swarmAvailable && defenseForecast.level === 'danger' && hudStyles.hudCardDanger,
          swarmAvailable && defenseForecast.level === 'warning' && hudStyles.hudCardWarning,
          swarmAvailable && defenseForecast.level === 'strong' && hudStyles.hudCardStrong,
          isHudCollapsed && hudStyles.hudCardCollapsed,
        ]}
      >
        {swarmAvailable && (
          <LinearGradient
            pointerEvents="none"
            colors={forecastGradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={hudStyles.hudReadyGradient}
          />
        )}
        <View style={hudStyles.hudHeaderRow}>
          {swarmActive ? (
            <View
              accessibilityLabel={`${normalizedRemainingIjoms} Ijoms remaining`}
              accessibilityRole="progressbar"
              style={hudStyles.swarmRemainingDonut}
            >
              <Svg width={donutSize} height={donutSize} viewBox={`0 0 ${donutSize} ${donutSize}`}>
                <Circle
                  cx={donutSize / 2}
                  cy={donutSize / 2}
                  r={donutRadius}
                  stroke="rgba(232,243,255,0.16)"
                  strokeWidth={donutStrokeWidth}
                  fill="rgba(2,6,23,0.42)"
                />
                <Circle
                  cx={donutSize / 2}
                  cy={donutSize / 2}
                  r={donutRadius}
                  stroke="#fcd34d"
                  strokeWidth={donutStrokeWidth}
                  strokeDasharray={`${donutCircumference} ${donutCircumference}`}
                  strokeDashoffset={donutDashOffset}
                  strokeLinecap="round"
                  fill="transparent"
                  transform={`rotate(-90 ${donutSize / 2} ${donutSize / 2})`}
                />
              </Svg>
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                numberOfLines={1}
                style={hudStyles.swarmRemainingDonutText}
              >
                {normalizedRemainingIjoms}
              </Text>
            </View>
          ) : (
            <Pressable
              style={hudStyles.exitButton}
              onPress={(event) => {
                event.stopPropagation();
                onExitPress();
              }}
            >
              <View style={hudStyles.hudHeaderText}>
                <MaterialCommunityIcons name="close" size={20} color="#fef3c7" />
              </View>
            </Pressable>
          )}
          <View style={hudStyles.hudHeaderText}>
            {swarmAvailable ? (
              <Pressable
                accessibilityLabel={`Activate defenses. Incoming wave ${displayedWaveSize} Ijoms. ${defenseForecast.readinessLabel}.`}
                accessibilityRole="button"
                onPress={(event) => {
                  event.stopPropagation();
                  onStartWave();
                }}
                style={[
                  hudStyles.hudActivateDefenseButton,
                  defenseForecast.level === 'danger' && hudStyles.hudActivateDefenseButtonDanger,
                  defenseForecast.level === 'warning' && hudStyles.hudActivateDefenseButtonWarning,
                ]}
              >
                <Ionicons name={forecastToneIcon} size={13} color="#fef3c7" />
                <Text style={hudStyles.hudActivateDefenseText}>{activateButtonText}</Text>
              </Pressable>
            ) : (
              <Text style={hudStyles.kicker}>{headerTitle}</Text>
            )}
          </View>
          <View style={hudStyles.starBalanceRow}>
            <View ref={starBalanceTargetRef} collapsable={false} style={hudStyles.starBalancePill}>
              <Image source={starIconSource} resizeMode="contain" style={hudStyles.starBalanceIcon} />
              <View style={hudStyles.starBalanceTextWrap}>
                <Text style={hudStyles.starBalanceValue}>{displayedStarBalance.toLocaleString()}</Text>
              </View>
            </View>
          </View>
          <Pressable
            accessibilityLabel={isHudCollapsed ? 'Expand HUD' : 'Collapse HUD'}
            accessibilityRole="button"
            style={hudStyles.hudToggle}
            onPress={(event) => {
              event.stopPropagation();
              onToggleCollapsed();
            }}
          >
            <Text style={hudStyles.hudToggleText}>{isHudCollapsed ? <MaterialCommunityIcons name={"chevron-down"} size={20} color="#fef3c7" /> : <MaterialCommunityIcons name={"chevron-up"} size={20} color="#fef3c7" />}</Text>
          </Pressable>
        </View>

        {!isHudCollapsed && (
          <>
            <View ref={swarmScheduleTourRef} collapsable={false}>
              <Text style={hudStyles.statusLine}>{statusLine}</Text>
              <View style={hudStyles.swarmActionRow}>
                <View
                  style={[
                    hudStyles.swarmExpandedInfo,
                    !swarmActive && defenseForecast.level === 'danger' && hudStyles.swarmExpandedInfoDanger,
                    !swarmActive && defenseForecast.level === 'warning' && hudStyles.swarmExpandedInfoWarning,
                    !swarmActive && defenseForecast.level === 'strong' && hudStyles.swarmExpandedInfoStrong,
                  ]}
                >
                  <Text style={hudStyles.swarmExpandedTitle}>{expandedStatusTitle}</Text>
                  <Text style={hudStyles.swarmExpandedSubtext}>{expandedStatusSubtext}</Text>
                  {!swarmActive && (
                    <>
                      <View style={hudStyles.forecastMeterRow}>
                        <View style={hudStyles.forecastMeterTrack}>
                          <View
                            style={[
                              hudStyles.forecastMeterFill,
                              defenseForecast.level === 'danger' && hudStyles.forecastMeterFillDanger,
                              defenseForecast.level === 'warning' && hudStyles.forecastMeterFillWarning,
                              defenseForecast.level === 'strong' && hudStyles.forecastMeterFillStrong,
                              { width: `${normalizedForecastChance}%` },
                            ]}
                          />
                        </View>
                        <Text style={hudStyles.forecastPercent}>{normalizedForecastChance}% survival</Text>
                      </View>
                      <View style={hudStyles.forecastStatRow}>
                        <View style={hudStyles.forecastStatPill}>
                          <MaterialCommunityIcons name="tree" size={11} color="#bbf7d0" />
                          <Text style={hudStyles.forecastStatText}>{defenseForecast.defenderCount} trees</Text>
                        </View>
                        <View style={hudStyles.forecastStatPill}>
                          <MaterialCommunityIcons name="wall" size={11} color="#fde68a" />
                          <Text style={hudStyles.forecastStatText}>{defenseForecast.wallLayers} walls</Text>
                        </View>
                      </View>
                    </>
                  )}
                </View>
              </View>
              {!swarmActive && forecastSuggestions.length > 0 && (
                <View style={hudStyles.forecastSuggestionList}>
                  {forecastSuggestions.map((suggestion) => (
                    <View key={suggestion} style={hudStyles.forecastSuggestionPill}>
                      <Ionicons name="construct" size={11} color="#fef3c7" />
                      <Text style={hudStyles.forecastSuggestionText}>{suggestion}</Text>
                    </View>
                  ))}
                </View>
              )}
              <Pressable
                accessibilityLabel={
                  forestSpiritReady
                    ? 'Use Forest Spirit powerup'
                    : `Forest Spirit progress ${normalizedForestSpiritProgress} of ${normalizedForestSpiritRequiredDays}`
                }
                accessibilityRole="button"
                disabled={!forestSpiritReady}
                onPress={(event) => {
                  event.stopPropagation();
                  onUseForestSpirit();
                }}
                style={[
                  hudStyles.forestSpiritTracker,
                  forestSpiritReady && hudStyles.forestSpiritTrackerReady,
                  !forestSpiritProgressLoaded && hudStyles.forestSpiritTrackerLoading,
                ]}
              >
                <View style={hudStyles.forestSpiritHeader}>
                  <View style={hudStyles.forestSpiritTitleRow}>
                    <MaterialCommunityIcons
                      name={forestSpiritReady ? 'forest' : 'tree'}
                      size={16}
                      color={forestSpiritReady ? '#bbf7d0' : '#86efac'}
                    />
                    <Text style={hudStyles.forestSpiritTitle}>Forest Spirit</Text>
                  </View>
                  <View style={[hudStyles.forestSpiritStatusPill, forestSpiritReady && hudStyles.forestSpiritStatusPillReady]}>
                    <Text
                      adjustsFontSizeToFit
                      minimumFontScale={0.7}
                      numberOfLines={1}
                      style={[hudStyles.forestSpiritStatusText, forestSpiritReady && hudStyles.forestSpiritStatusTextReady]}
                    >
                      Heals Village 10%
                    </Text>
                  </View>
                </View>
                <View style={hudStyles.forestSpiritDayRow}>
                  {Array.from({ length: forestSpiritCircleDays }, (_, index) => {
                    const dayNumber = index + 1;
                    const completed = dayNumber <= normalizedForestSpiritProgress;
                    const next = !forestSpiritReady && dayNumber === normalizedForestSpiritProgress + 1;
                    return (
                      <View
                        key={dayNumber}
                        style={[
                          hudStyles.forestSpiritDayBubble,
                          completed && hudStyles.forestSpiritDayBubbleComplete,
                          next && hudStyles.forestSpiritDayBubbleNext,
                          forestSpiritReady && hudStyles.forestSpiritDayBubbleReady,
                        ]}
                      >
                        <Text
                          style={[
                            hudStyles.forestSpiritDayText,
                            completed && hudStyles.forestSpiritDayTextComplete,
                            forestSpiritReady && hudStyles.forestSpiritDayTextReady,
                          ]}
                        >
                          {dayNumber}
                        </Text>
                      </View>
                    );
                  })}
                  <View
                    style={[
                      hudStyles.forestSpiritRewardWrap,
                      forestSpiritRewardVisible && hudStyles.forestSpiritRewardWrapReady,
                    ]}
                  >
                    <Image
                      source={forestSpiritImageSource}
                      resizeMode="contain"
                      style={[
                        hudStyles.forestSpiritRewardImage,
                        { opacity: forestSpiritRewardVisible ? 1 : 0.5 },
                      ]}
                    />
                  </View>
                </View>
              </Pressable>
            </View>
          </>
        )}
      </Pressable>
    </View>
  );
}
