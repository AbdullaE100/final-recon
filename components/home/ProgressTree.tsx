import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import Svg, { Path, Circle } from 'react-native-svg';

interface ProgressTreeProps {
  streak: number;
  level: number;
}

export default function ProgressTree({ streak, level }: ProgressTreeProps) {
  const { colors } = useTheme();
  
  // Calculate growth stage based on streak and level
  // This is a simplified version - you can make it more complex
  const growth = Math.min(1, (streak / 90) + (level / 10) * 0.5);
  
  // Tree elements visibility based on growth stage
  const showRoots = growth > 0;
  const showTrunk = growth > 0.1;
  const showBranches = growth > 0.3;
  const showLeaves1 = growth > 0.5;
  const showLeaves2 = growth > 0.7;
  const showLeaves3 = growth > 0.9;
  
  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <Svg height="140" width="120" viewBox="0 0 120 140">
        {/* Ground */}
        <Path
          d="M10,130 C20,125 90,125 110,130 L110,140 L10,140 Z"
          fill={colors.progressGround}
        />
        
        {/* Roots */}
        {showRoots && (
          <>
            <Path
              d="M55,130 L50,134 L45,137 L40,139"
              stroke={colors.progressTrunk}
              strokeWidth="2"
              fill="none"
            />
            <Path
              d="M65,130 L70,134 L75,137 L80,139"
              stroke={colors.progressTrunk}
              strokeWidth="2"
              fill="none"
            />
            <Path
              d="M60,130 L60,135 L60,140"
              stroke={colors.progressTrunk}
              strokeWidth="2"
              fill="none"
            />
          </>
        )}
        
        {/* Trunk */}
        {showTrunk && (
          <Path
            d="M60,130 L60,90"
            stroke={colors.progressTrunk}
            strokeWidth="4"
            fill="none"
          />
        )}
        
        {/* Branches */}
        {showBranches && (
          <>
            <Path
              d="M60,90 L40,70"
              stroke={colors.progressTrunk}
              strokeWidth="3"
              fill="none"
            />
            <Path
              d="M60,90 L80,70"
              stroke={colors.progressTrunk}
              strokeWidth="3"
              fill="none"
            />
            <Path
              d="M60,90 L60,50"
              stroke={colors.progressTrunk}
              strokeWidth="3"
              fill="none"
            />
          </>
        )}
        
        {/* Leaves Level 1 */}
        {showLeaves1 && (
          <>
            <Circle cx="40" cy="70" r="10" fill={colors.progressLeaves} />
            <Circle cx="80" cy="70" r="10" fill={colors.progressLeaves} />
            <Circle cx="60" cy="50" r="10" fill={colors.progressLeaves} />
          </>
        )}
        
        {/* Leaves Level 2 */}
        {showLeaves2 && (
          <>
            <Circle cx="30" cy="60" r="8" fill={colors.progressLeaves} />
            <Circle cx="90" cy="60" r="8" fill={colors.progressLeaves} />
            <Circle cx="50" cy="40" r="8" fill={colors.progressLeaves} />
            <Circle cx="70" cy="40" r="8" fill={colors.progressLeaves} />
          </>
        )}
        
        {/* Leaves Level 3 */}
        {showLeaves3 && (
          <>
            <Circle cx="40" cy="50" r="7" fill={colors.progressLeaves} />
            <Circle cx="80" cy="50" r="7" fill={colors.progressLeaves} />
            <Circle cx="60" cy="30" r="7" fill={colors.progressLeaves} />
            <Circle cx="45" cy="35" r="6" fill={colors.progressLeaves} />
            <Circle cx="75" cy="35" r="6" fill={colors.progressLeaves} />
            <Circle cx="60" cy="20" r="8" fill={colors.progressLeaves} />
          </>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: 150,
    height: 180,
  }
});